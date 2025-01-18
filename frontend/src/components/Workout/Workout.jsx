import React, { useState, useEffect} from "react";
import { useDispatch, useSelector } from "react-redux";
import { logWorkout, fetchWorkoutsByUser, updateWorkout, deleteWorkout } from "../../store/workout";
//import Workout.css from './Workout.css';

function Workout () {
    const dispatch = useDispatch();
    const userId = useSelector((state) => state.session.user.id);
    const workouts = useSelector((state) => state.workout.sessions);
}