import mapPin from '../../assets/map-pin.png'
import calendarEvent from '../../assets/calendar-event.png'

const icons = {
    'calendar-event': calendarEvent,
    'map-pin': mapPin,
}

type IconProps = {
    name: keyof typeof icons
    size?: number
}

function Icon({ name, size = 20 }: IconProps) {
    return <img src={icons[name]} width={size} height={size} alt="" aria-hidden />
}

export default Icon
