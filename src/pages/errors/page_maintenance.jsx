import { useEffect } from "react";
import Link from "../../components/atoms/Link";
import "../../styles/page-misc.css";

const PageMaintenance = () => {

    return <>
        <div className="misc-wrapper h-100">
            <h1 className="mb-2 mx-2">Under Maintenance! 🚧</h1>
            <p className="mb-6 mx-sm-2 text-center">
                Sorry for the inconvenience but we're performing some maintenance at the moment
            </p>
            <div className="d-flex justify-content-center mt-9">
                
                <div className="d-flex flex-column align-items-center">
                    <div>
                        <Link to="/dashboard" className="btn btn-primary text-center my-10">Back to home</Link>
                    </div>
                </div>
            </div>
        </div>
    </>
}

export default PageMaintenance;