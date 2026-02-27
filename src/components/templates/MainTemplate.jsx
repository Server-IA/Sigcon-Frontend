import { Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

import MenuNav from "../organism/MenuNav";
import NavHorizontal from "../organism/NavHorizontal";

const MainTemplate = () =>{

    return (
        <>
            <div className="layout-wrapper layout-content-navbar">
                <div className="layout-container">
                    <MenuNav />
                    <div className="layout-page">
                        <NavHorizontal />
                        <div className="content-wrapper">
                            <div className="container-xxl flex-grow-1 container-p-y">
                                <div className="row g-6">
                                    <Outlet />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="layout-overlay layout-menu-toggle"></div>
            </div>
        </>
    );
};

export default MainTemplate;