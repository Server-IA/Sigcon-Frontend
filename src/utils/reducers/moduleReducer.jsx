const initialState = {
    modules: [],
    allSystemPaths: []
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
        case "SET_ALL_SYSTEM_PATHS":
            return {
                ...state,
                allSystemPaths: action.payload
            };
        default:
            return state;
    }
}