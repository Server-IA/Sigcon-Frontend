import Icon from '../atoms/Icon';

const ICONS = {
  error: 'ri-error-warning-line',
  warning: 'ri-error-warning-line',
  success: 'ri-checkbox-circle-line',
};

const NotificationBar = ({ type, message, onClose }) => {
  if (!type || !message) return null;

  const alertClass = `notification-bar notification-bar--${type}`;

  return (
    <div className={alertClass} role="alert">
      <div className="notification-bar-content">
        <span className="notification-bar-icon">
          <Icon name={ICONS[type] || ICONS.error} />
        </span>
        <p className="notification-bar-message">{message}</p>
      </div>
      {onClose && (
        <button type="button" className="notification-bar-close" onClick={onClose} aria-label="Cerrar">
          <Icon name="ri-close-line" />
        </button>
      )}
    </div>
  );
};

export default NotificationBar;
