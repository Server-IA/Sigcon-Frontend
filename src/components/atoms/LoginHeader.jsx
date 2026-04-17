import Icon from '../atoms/Icon';

const LoginHeader = () => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-center mb-6">
        <Icon name="ri-shield-keyhole-line" className="text-6xl text-indigo-600" />
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Bienvenido a SIGCON
        </h1>
        <p className="text-gray-600">
          Por favor Inicia sesión
        </p>
      </div>
    </div>
  );
};

export default LoginHeader;