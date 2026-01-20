import Icon from "../atoms/Icon";
import { Link } from "react-router-dom";

const MenuChildrenItem = ({ option, active }) => {

    return <>
        <li className={`menu-item ${active ? "active open" : ""}`}>
            <a type="button" className="menu-link menu-toggle">
                <Icon name={option.icon} className="menu-icon tf-icons" />
                <div>{option.option}</div>
            </a>
            <ul className="menu-sub">
                {
                    option.childrens.map((child) => (
                        <li key={child.id} className="menu-item">
                            <Link to={`${option.path}${child.path}`} className="menu-link">
                                <div>{child.option}</div>
                            </Link>
                        </li>
                    ))
                }
            </ul>
        </li>
    </>
}

export default MenuChildrenItem;