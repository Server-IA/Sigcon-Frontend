import { Outlet } from 'react-router-dom';
import AuthHeader from "../molecules/AuthHeader";

const AuthTemplate = () => {
  return (
    <div className="auth-layout">
      <header className="auth-header">
        <AuthHeader />
      </header>
      <main className="auth-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AuthTemplate;
