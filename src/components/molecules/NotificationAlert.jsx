import Icon from '../atoms/Icon';

const NotificationAlert = ({ message, type = 'error', onClose }) => {
  if (!message) return null;

  const isSuccess = type === 'success';
  const alertClass = isSuccess ? 'notification-alert-success' : 'notification-alert-error';

  return (
    <div className={`notification-alert ${alertClass}`} role="alert">
      <div className="notification-alert-content">
        <div className="notification-alert-icon">
          <Icon name={isSuccess ? "ri-checkbox-circle-line" : "ri-error-warning-line"} />
        </div>
        <p className="notification-alert-message">{message}</p>
      </div>
      {onClose && (
        <button 
          className="notification-alert-close"
          onClick={onClose}
          aria-label="Cerrar notificación"
        >
          <Icon name="ri-close-line" />
        </button>
      )}
    </div>
  );
};

export default NotificationAlert;
