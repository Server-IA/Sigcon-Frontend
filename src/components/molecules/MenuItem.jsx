import { Link } from "react-router-dom"
import Icon from "../atoms/Icon"

const MenuItem = ({ url_module, option, active }) => {

  console.log(["Option MenuItem", option]);

  return (
    <li className={`menu-item ${active ? "active" : ""}`}>
      <Link to={`${url_module}/${option.path}`} className="menu-link">
        <Icon name={option.icon} className="menu-icon tf-icons" />
        <div>{option.label}</div>
      </Link>
    </li>
  )
}

export default MenuItem
