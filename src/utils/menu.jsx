export const isActivePath = (menuPath, currentPath) => {
    if (menuPath === "/") return currentPath === "/";
    return currentPath === menuPath || currentPath.startsWith(menuPath + "/");
};

export const isParentActive = (option, pathname) => {
    if (isActivePath(option.url, pathname)) return true;
  
    return option.childrens?.some(child =>
      isActivePath(child.path, pathname)
    );
};  