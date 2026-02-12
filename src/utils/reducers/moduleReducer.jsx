const initialState = {
    modules: []
};

export default function moduleReducer(state = initialState, action) {
    switch (action.type) {
        case "SET_MODULES":
            return {
                ...state,
                modules: action.payload
            };
        case "GET_MODULES":
            return {
                ...state,
                modules: action.payload
            };
        default:
            return state;
    }
}