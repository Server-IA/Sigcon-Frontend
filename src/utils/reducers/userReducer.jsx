// store/userReducer.js
const initialState = {
    user: null
};
  
export default function userReducer(state = initialState, action) {
    switch (action.type) {
        case "SET_USER":
            return {
                ...state,
                user: action.payload
            };

        case "LOGOUT":
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
