export const isActivePath = (menuPath, currentPath) => {
  if (!menuPath) return false;

  const normalize = path => path.replace(/\/+$/, "");

  return normalize(currentPath) === normalize(menuPath) ||
         normalize(currentPath).startsWith(normalize(menuPath) + "/");
};

export const isParentActive = (module, menu, pathname) => {

  const menuFullPath = joinPaths(module.url, menu.url);

  // 1️⃣ El menú en sí
  if (isActivePath(menuFullPath, pathname)) return true;

  // 2️⃣ Hijos
  return menu.childrens?.some(child => {
      const childFullPath = joinPaths(
          module.url,
          menu.url,
          child.url
      );

      return isActivePath(childFullPath, pathname);
  }) ?? false;
};

const joinPaths = (...paths) =>
  "/" + paths
      .filter(Boolean)
      .map(p => p.replace(/^\/|\/$/g, ""))
      .join("/");
