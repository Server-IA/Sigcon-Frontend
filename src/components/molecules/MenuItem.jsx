import { Link } from "react-router-dom"
import Icon from "../atoms/Icon"

const MenuItem = ({ option, active }) => {

  return (
    <li className={`menu-item ${active ? "active" : ""}`}>
      <Link to={option.path} className="menu-link">
        <Icon name={option.icon} className="menu-icon tf-icons" />
        <div>{option.option}</div>
      </Link>
    </li>
  )
}

export default MenuItem
