import Link from "../../components/atoms/Link";
import "../../styles/page-misc.css";
import { useSelector } from "react-redux";

const Page403 = () => {

    const user = useSelector(state => state.user).user;
    const text = user ? 'Ir a inicio' : 'Ir a login';

    return <>
        <div className="misc-wrapper h-100 w-100" style={{ height: "100vh"}}>
            <h1 className="mb-2 mx-2" style={{ fontSize: "6rem", lineHeight: "6rem" }}>403</h1>
            <h4 className="mb-2">Acceso denegado</h4>
            <p className="mb-6 mx-2">No tiene permisos suficientes para acceder a este modulo. Por favor contacte al administrador del sistema.</p>
            <div className="d-flex justify-content-center mt-9">
                <div className="d-flex flex-column align-items-center">
                    <div>
                        <Link to={user ? "/dashboard" : "/login"} className="btn btn-primary text-center my-10">{
                            text
                        }</Link>
                    </div>
                </div>
            </div>
        </div>
    </>
}

export default Page403;
