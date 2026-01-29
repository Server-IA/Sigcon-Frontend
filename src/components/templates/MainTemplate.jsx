import { Outlet } from "react-router-dom";

import MenuNav from "../organism/MenuNav";

const MainTemplate = ({modules}) =>{
    return (
        <>
            <div className="layout-wrapper layout-content-navbar">
                <div className="layout-container">
                    <MenuNav modules={modules} />
                    <div className="layout-page">
                        <div className="content-wrapper">
                            <div className="container-xxl flex-grow-1 container-p-y">
                                <div className="row g-6">
                                    <Outlet />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default MainTemplate;