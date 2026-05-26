import LogoBrand from './LogoBrand';

// QA (2026-05-26): se elimino el boton de modo oscuro (luna) del header de login.
// Era un boton sin handler (no hacia nada) y el profesor pidio quitarlo porque
// el login se maneja con colores diurnos.
const AuthHeader = () => {
  return (
    <div className="auth-header-content">
      <LogoBrand />
    </div>
  );
};

export default AuthHeader;