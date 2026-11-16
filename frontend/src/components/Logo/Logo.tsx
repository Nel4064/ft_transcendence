import { Link } from 'react-router-dom'
import chairDirector from '../../assets/chair-director.png'

const logoClass = "flex items-center gap-2 text-text"
const imageClass = "h-16"
const nameClass = "font-serif font-bold text-logo"

function Logo() {
	return (
		<Link to="/" className={logoClass}>
			<img src={chairDirector} alt="" className={imageClass} />
			<span className={nameClass}>CineClub</span>
		</Link>
	)
}

export default Logo
