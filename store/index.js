import {configureStore} from "@reduxjs/toolkit" ;
import authReducer  from "./slices/authslices" ;
const store = configureStore({
    reducer : {
        auth : authReducer ,
    }
});
export default store ;