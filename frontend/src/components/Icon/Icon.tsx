import mapPin from '../../assets/map-pin.png'
import calendarEvent from '../../assets/calendar-event.png'
import idOff from '../../assets/id-off.png'
import world from '../../assets/world.png'
import shield from '../../assets/shield.png'
import arrowBack from '../../assets/arrow-back.png'
import check from '../../assets/check.png'
import messageCircle from '../../assets/message-circle.png'
import calendarClock from '../../assets/calendar-clock.png'
import movie from '../../assets/movie.png'
import bolt from '../../assets/bolt.png'

const icons = {
    'calendar-event': calendarEvent,
    'map-pin': mapPin,
    'id-off': idOff,
    'world': world,
    'shield': shield,
    'arrow-back': arrowBack,
    'check': check,
    'message-circle': messageCircle,
    'calendar-clock': calendarClock,
    'movie': movie,
    'bolt': bolt,
}

type IconProps = {
    name: keyof typeof icons
    size?: number
}

function Icon({ name, size = 20 }: IconProps) {
    return <img src={icons[name]} width={size} height={size} alt="" aria-hidden />
}

export default Icon
