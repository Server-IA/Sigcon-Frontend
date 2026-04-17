import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";

import { buildFullPath, COMPONENT_MAP } from "../../utils/map_menu";

/** Compara la URL actual con la ruta del menú; segmentos `:param` cuentan como comodín. */
const pathsMatch = (currentPath, patternPath) => {
    const norm = (p) => p.replace(/^\/+|\/+$/g, "");
    const cur = norm(currentPath).split("/").filter(Boolean);
    const pat = norm(patternPath).split("/").filter(Boolean);
    if (cur.length !== pat.length) return false;
    return pat.every((seg, i) => seg.startsWith(":") || cur[i] === seg);
};

const ItemMenu = ({ item, parentPath = "" }) => {
    const location = useLocation();
    const hasChildren = item.childrens.filter(child => child.visible).length > 0;
    
    const component = COMPONENT_MAP.find(c => c.id === item.component);

    const [isOpen, setIsOpen] = useState(false);
    const [isActive, setIsActive] = useState(false);
    let rawPath = item?.path ?? item?.url ?? "";

    if(component?.options){
        Object.keys(component.options).forEach(key => {
            rawPath = rawPath.replace(`:${key}`, component.options[key]);
        });
    }
    
    const itemPath = useMemo(
        () => buildFullPath(parentPath, rawPath).replace(/^\//, ""),
        [parentPath, rawPath]
    );

    const cleanLocation = location.pathname.replace(/^\//, "");
    const cleanItemPath = itemPath.replace(/^\//, "");

    useEffect(() => {
        const inThisSubtree = isPathActive(item, parentPath, cleanLocation);
        setIsActive(inThisSubtree);
        setIsOpen(hasChildren && inThisSubtree);
    }, [cleanLocation, cleanItemPath, hasChildren, item, parentPath]);



    // const isActive = cleanLocation === cleanItemPath;
    // const isOpen =
    //     hasChildren &&
    //     isPathActive(item, parentPath, cleanLocation);

    return (

        <>
            {item.id == 0 ? (
                
                <li className={`menu-item ${isActive ? "active" : ""}`}>
                    <Link
                        to={itemPath}
                        className={`menu-link `}
                    >
                        <i className={`menu-icon tf-icons ${item.icon || "ri-arrow-drop-right-line"}`}></i>
                        <div>{item?.name || item.label}</div>
                    </Link>
                </li>
            ) : (
                <li className={`menu-item ${isOpen ? "open" : ""} ${isActive ? "active" : ""}`}>
                    <Link
                        to={itemPath}
                        className={`menu-link ${hasChildren ? "menu-toggle" : ""}`}
                    >
                        <i className={`menu-icon tf-icons ${item.icon || "ri-arrow-drop-right-line"}`}></i>
                        <div>{item?.name || item.label}</div>
                    </Link>

                    {hasChildren && (
                        <ul className="menu-sub">
                            {item.childrens.filter(child => child.visible).map(child => (
                                <ItemMenu
                                    key={child.id}
                                    item={child}
                                    parentPath={cleanItemPath}
                                />
                            ))}
                        </ul>
                    )}
                </li>
            )}
        </>

    );
};

const isPathActive = (item, parentPath, currentPath) => {
    const rawPath = item.path ?? item.url ?? "";
    const fullPath = buildFullPath(parentPath, rawPath).replace(/^\//, "");

    if (pathsMatch(currentPath, fullPath)) return true;

    if (!item.childrens?.length) return false;

    return item.childrens.some((child) =>
        isPathActive(child, fullPath, currentPath)
    );
};

export const hasActiveChild = (item, parentPath) => {
    if (!item.childrens?.length) return false;
    const location = useLocation();

    return item.childrens.some(child => {
        const childPath = buildFullPath(parentPath, child.path ?? child.url);
        return (
            location.pathname === childPath ||
            hasActiveChild(child, childPath.replace(/^\//, ""), item)
        );
    });
};


export default ItemMenu;
