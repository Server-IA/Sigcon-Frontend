import Link from "../../components/atoms/Link";
import "../../styles/page-misc.css";



const Page404 = () => {
    
    const token = localStorage.getItem('token');

    return <>
        <div className="misc-wrapper h-100">
            <h1 className="mb-2 mx-2" style={{ fontSize: "6rem", lineHeight: "6rem" }}>404</h1>
            <h4 className="mb-2">Page Not Found ⚠️</h4>
            <p className="mb-6 mx-2">we couldn't find the page you are looking for</p>
            <div className="d-flex justify-content-center mt-9">
                <div className="d-flex flex-column align-items-center">
                    <div>
                        <Link to={token ? '/dashboard' : '/login'} className="btn btn-primary text-center my-10">{
                            token ? 'Back to home' : 'Go to login'
                        }</Link>
                    </div>
                </div>
            </div>
        </div>
    </>
}

export default Page404;