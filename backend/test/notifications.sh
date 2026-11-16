#!/usr/bin/env bash
# End-to-end test of the notifications routes (list, mark read, mark all read)
# and of who may pick / unpick screenings. Needs the dev stack running, curl and jq.
set -u
API=${API:-http://localhost:3000/api}
FEED=https://datacinesindes.fr/data-fair/api/v1/datasets/programmation-cinemas/lines

PASSED=0; FAILED=0
GREEN=$'\033[32m'; RED=$'\033[31m'; BOLD=$'\033[1m'; RESET=$'\033[0m'

step() { printf '\n%s== %s%s\n' "$BOLD" "$*" "$RESET"; }
ok()   { printf '  %sOK  %s  %-36s %s\n' "$GREEN" "$RESET" "$1" "$2"; PASSED=$((PASSED + 1)); }
fail() { printf '  %sFAIL%s  %-36s %s\n' "$RED" "$RESET" "$1" "$2"; FAILED=$((FAILED + 1)); }

# call METHOD PATH [TOKEN] [JSON]: sends one request, sets CODE (HTTP status) and BODY
call() {
  local args=(-s -X "$1" -w '\n%{http_code}' "$API$2")
  [ -n "${3:-}" ] && args+=(-H "Authorization: Bearer $3")
  [ -n "${4:-}" ] && args+=(-H 'Content-Type: application/json' -d "$4")
  local out; out=$(curl "${args[@]}")
  CODE=${out##*$'\n'}
  BODY=${out%$'\n'*}
}

# The server's explanation, e.g. "Forbidden resource" for a 403
reason() { jq -r 'if type == "object" then .message // empty else empty end' <<<"$BODY" 2>/dev/null; }

# check LABEL EXPECTED_STATUS METHOD PATH [TOKEN] [JSON]
check() {
  local label=$1 want=$2; shift 2
  call "$@"
  if [ "$CODE" = "$want" ]; then ok "$label" "$CODE $(reason)"
  else fail "$label" "expected $want, got $CODE $(reason)"; fi
}

# equals LABEL ACTUAL EXPECTED
equals() {
  if [ "$2" = "$3" ]; then ok "$1" "$2"
  else fail "$1" "expected '$3', got '$2'"; fi
}

step "1. Register two users"
for u in alice bob; do
  call POST /auth/register "" "{\"username\":\"test_$u\",\"email\":\"test_$u@example.com\",\"password\":\"password123\"}"
  echo "  test_$u: $(reason)"
done

step "2. Log in, keep the tokens"
login() {
  call POST /auth/login "" "{\"identifier\":\"test_$1\",\"password\":\"password123\"}"
  jq -r '.access_token' <<<"$BODY"
}
ALICE=$(login alice); BOB=$(login bob)
if [ "$ALICE" != null ] && [ "$BOB" != null ]; then ok "both users logged in" ""
else fail "login" "no token, stopping"; exit 1; fi

step "3. Make Bob an admin, Alice stays a user (direct DB update: no API for roles yet)"
docker exec -i development-db sh -c 'psql -q -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL' 2>&1 | grep -v '^Emulate Docker'
UPDATE users SET role = 'ADMIN' WHERE username = 'test_bob';
UPDATE users SET role = 'USER'  WHERE username = 'test_alice';
SQL
echo "  test_bob: ADMIN, test_alice: USER"

step "4. Without a token -> 401 Unauthorized"
check "list notifications"  401 GET  /notifications
check "pick a screening"    401 POST /screenings "" '{}'

step "5. Pick a screening: Alice (USER) is refused, Bob (ADMIN) succeeds"
ROW=$(curl -s "$FEED?size=1&select=cineid,showid,filmtitle&sort=-showstart" | jq -c '.results[0]')
CINEID=$(jq -r .cineid <<<"$ROW"); SHOWID=$(jq -r .showid <<<"$ROW")
echo "  screening from the feed: $(jq -r .filmtitle <<<"$ROW") ($CINEID / $SHOWID)"
PICK="{\"cineid\":$CINEID,\"showid\":\"$SHOWID\"}"
check "Alice picks -> 403 Forbidden"  403 POST /screenings "$ALICE" "$PICK"
check "Bob picks -> 201 Created"      201 POST /screenings "$BOB"   "$PICK"
SCREENING_ID=$(jq -r .id <<<"$BODY")

step "6. Alice is notified, with Bob as the actor; Bob is not notified"
call GET /notifications "$ALICE"
jq -c '.[:3][] | {type, film: .payload.filmTitle, actor: .actor.displayName, readAt}' <<<"$BODY"
ID=$(jq -r '.[0].id' <<<"$BODY")
equals "newest is a CLUB_PICK"        "$(jq -r '.[0].type' <<<"$BODY")" CLUB_PICK
equals "actor is Bob"                 "$(jq -r '.[0].actor.displayName' <<<"$BODY")" test_bob
call GET /notifications "$BOB"
equals "Bob got nothing for his pick" "$(jq --arg s "$SCREENING_ID" '[.[] | select(.payload.screeningId == $s)] | length' <<<"$BODY")" 0

step "7. Mark one as read: bad id, unknown id, someone else's, then the real one"
check "not a uuid -> 400"             400 PATCH /notifications/not-a-uuid/read "$ALICE"
check "unknown uuid -> 404"           404 PATCH /notifications/00000000-0000-0000-0000-000000000000/read "$ALICE"
check "Bob marks Alice's -> 404"      404 PATCH "/notifications/$ID/read" "$BOB"
check "Alice marks her own -> 204"    204 PATCH "/notifications/$ID/read" "$ALICE"
call GET /notifications "$ALICE"
equals "readAt is now set"            "$(jq -r --arg id "$ID" '.[] | select(.id == $id) | .readAt != null' <<<"$BODY")" true

step "8. Unpick: Alice is refused, Bob succeeds; then Alice marks all as read"
check "Alice unpicks -> 403 Forbidden" 403 DELETE "/screenings/$CINEID/$SHOWID" "$ALICE"
check "Bob unpicks -> 200 OK"          200 DELETE "/screenings/$CINEID/$SHOWID" "$BOB"
call GET /notifications "$ALICE"
echo "  Alice unread before: $(jq '[.[] | select(.readAt == null)] | length' <<<"$BODY")"
check "mark all as read -> 200"        200 PATCH /notifications/read-all "$ALICE"
echo "  marked: $(jq -r .count <<<"$BODY")"
call GET /notifications "$ALICE"
equals "Alice unread after"            "$(jq '[.[] | select(.readAt == null)] | length' <<<"$BODY")" 0
call GET /notifications "$BOB"
equals "Bob got nothing for his unpick" "$(jq --arg s "$SCREENING_ID" '[.[] | select(.payload.screeningId == $s)] | length' <<<"$BODY")" 0

printf '\n%s%d passed, %d failed%s\n' "$BOLD" "$PASSED" "$FAILED" "$RESET"
[ "$FAILED" -eq 0 ]
