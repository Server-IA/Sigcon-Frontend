import Icon from "../atoms/Icon";
import { Link } from "react-router-dom";

const MenuChildrenItem = ({ url_module, option, active }) => {

    return <>
        <li className={`menu-item ${active ? "active open" : ""}`}>
            <a type="button" className="menu-link menu-toggle">
                <Icon name={option.icon} className="menu-icon tf-icons" />
                <div>{option.label}</div>
            </a>
            <ul className="menu-sub">
                {
                    option.childrens.map((child) => (
                        <li key={child.id} className="menu-item">
                            <Link to={`${url_module}/${option.path}/${child.path}`} className="menu-link">
                                <div>{child.label}</div>
                            </Link>
                        </li>
                    ))
                }
            </ul>
        </li>
    </>
}

export default MenuChildrenItem;