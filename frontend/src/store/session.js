import { csrfFetch } from './csrf';

// Action Types
const SET_SESSION_USER = 'session/setSessionUser';
const REMOVE_SESSION_USER = 'session/removeSessionUser';

// Action Creators
const setSessionUser = (user) => ({
  type: SET_SESSION_USER,
  user,
});

const removeSessionUser = () => ({
  type: REMOVE_SESSION_USER,
});

// Thunk Action Creators
export const login = (user) => async (dispatch) => {
  const { credential, password } = user;
  const response = await csrfFetch('/api/session/login', {
    method: 'POST',
    body: JSON.stringify({
      credential,
      password,
    }),
  });
  const data = await response.json();
  dispatch(setSessionUser(data.user));
  return response;
};

export const signup = (user) => async (dispatch) => {
    const { email, password, username, firstName, lastName, exerciseGoalMinutes, waterGoalOz, meditationGoalMinutes } = user;
    const response = await csrfFetch('/api/users/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        username,
        firstName,
        lastName,
        exerciseGoalMinutes,
        waterGoalOz,
        meditationGoalMinutes,
      }),
    });
    const data = await response.json();
    dispatch(setSessionUser(data.user));
    return response;
  };
  

export const logout = () => async (dispatch) => {
  const response = await csrfFetch('/api/session/logout', {
    method: 'DELETE',
  });
  dispatch(removeSessionUser());
  return response;
};

export const restoreUser = () => async (dispatch) => {
  const response = await csrfFetch('/api/session/restore');
  const data = await response.json();
  dispatch(setSessionUser(data.user));
  return response;
};



// Initial State
const initialState = { user: null };

// Reducer
const sessionReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_SESSION_USER:
      return { ...state, user: action.user };
    case REMOVE_SESSION_USER:
      return { ...state, user: null };
    default:
      return state;
  }
};

export default sessionReducer;