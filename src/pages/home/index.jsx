import { useSelector } from "react-redux";

const Home = () => {

    const user = useSelector(state => state.user).user;
    

    return (
        <div>
            <h1>Home</h1>
            <p>Welcome to the home page <b>{user?.name ?? ''} {user?.last_name ?? ''}</b></p>
        </div>
    )
}

export default Home