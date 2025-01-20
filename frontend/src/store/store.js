import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import { thunk } from 'redux-thunk';
import sessionReducer from './session';
import profileReducer from './profile';
import summaryReducer from './summary';
import meditationReducer from './meditation';
import workoutReducer from './workout';
import waterIntakeReducer from './waterintake';

const rootReducer = combineReducers({
    session: sessionReducer,
    profile: profileReducer,
    summary: summaryReducer,
    meditation: meditationReducer,
    workout: workoutReducer,
    water: waterIntakeReducer,
//add reducers here
});

let enhancer;
if (import.meta.env.MODE === 'production') {
    enhancer = applyMiddleware(thunk);
} else {
    const logger = (await import('redux-logger')).default;
    const composeEnhancers = 
        window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
    enhancer = composeEnhancers(applyMiddleware(thunk, logger));
}

const configureStore = (preloadedState) => {
    return createStore(rootReducer, preloadedState, enhancer);
}

export default configureStore;