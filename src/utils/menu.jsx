export const isActivePath = (menuPath, currentPath) => {
    if (menuPath === "/") return currentPath === "/";
    return currentPath === menuPath || currentPath.startsWith(menuPath + "/");
};

export const isParentActive = (option, pathname) => {
    if (isActivePath(option.path, pathname)) return true;
  
    return option.children?.some(child =>
      isActivePath(child.path, pathname)
    );
};  