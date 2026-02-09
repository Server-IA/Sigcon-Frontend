import LogoBrand from './LogoBrand';
import Icon from '../atoms/Icon';

const AuthHeader = () => {
  return (
    <div className="auth-header-content">
      <LogoBrand />
      <button className="auth-darkmode-btn" aria-label="Cambiar tema">
        <Icon name="ri-moon-line" />
      </button>
    </div>
  );
};

export default AuthHeader;