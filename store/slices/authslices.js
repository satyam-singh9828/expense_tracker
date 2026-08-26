import {createSlice} from "@reduxjs/toolkit" ;
const intialState = {
    isLoggedIn : localStorage.getItem("token") ? true : false ,
    token : localStorage.getItem("token") || null ,
    userType : localStorage.getItem("userType") || null,
    user : JSON.parse(localStorage.getItem("user")) || null ,
    
}
const authSlice = createSlice({
    name : "auth" ,
    initialState : intialState ,
    reducers : {
        login(state , action ) {
        state.isLoggedIn = true ;
        state.token = action.payload.token ;
        state.userType = action.payload.userType || null ;
        state.user = action.payload.user;
        localStorage.setItem("token", action.payload.token);
        if (action.payload.userType) {
          localStorage.setItem("userType", action.payload.userType);
        } else {
          localStorage.removeItem("userType");
        }
        localStorage.setItem("user", JSON.stringify(action.payload.user));
        },
           logout(state ) {
                state.isLoggedIn = false ;
                state.token = null ;
                state.userType = null ;
                state.user = null;
                localStorage.removeItem("token");
                localStorage.removeItem("userType");
                localStorage.removeItem("user");
            }
        }
    });
    export const {login , logout} = authSlice.actions ;
    export default authSlice.reducer ;
