type LoaderProps = {
  text?: string
}

const wrapperClass = "flex items-center justify-center gap-3 py-12 text-body text-text-muted"
const spinnerClass = "w-5 h-5 rounded-full border-2 border-border border-t-brand animate-spin"

function Loader({ text = "Loading..." }: LoaderProps) {
  return (
    <div role="status" className={wrapperClass}>
      <span className={spinnerClass} aria-hidden />
      {text}
    </div>
  )
}

export default Loader
