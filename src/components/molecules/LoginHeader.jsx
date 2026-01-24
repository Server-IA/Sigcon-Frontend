import Icon from '../atoms/Icon';

const AuthHeader = () => {
  return (
    <div className="text-center mb-8">
      <div className="auth-logo-brand">
        <div className="auth-logo-icon">
          <Icon name="ri-shield-keyhole-line" className="text-2xl" />
        </div>
        <span>SIGCON</span>
      </div>
      <h1 className="login-form-title mt-6">Iniciar sesión</h1>
    </div>
  );
};

export default AuthHeader;