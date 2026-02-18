// store/userReducer.js
const initialState = {
    user: null
};
  
export default function userReducer(state = initialState, action) {
    switch (action.type) {
        case "SET_USER":
            localStorage.setItem('user', JSON.stringify(action.payload));
            return {
                ...state,
                user: action.payload
            };

        case "LOGOUT":
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            return {
                ...state,
                user: null
            };
        case "GET_USER":
            return {
                ...state,
                user: action.payload
            };

        case "SET_TOKEN":
            localStorage.setItem('token', action.payload);
            return {
                ...state,
                token: action.payload
            }; 

        case "GET_TOKEN":
            
            return {
                ...state,
                token: action.payload
            }; 

        default:
            return state;
    }
}
