# Clarity API Documentation

## Base URL
```
website url idea heheheh
https://clarity.com
```

## Endpoints

### Users

#### POST /users/register
**Description:** Register a new user.
- **Request Body:**
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string",
    "exerciseGoalMinutes": "integer",
    "waterGoalOz": "integer",
    "meditationGoalMinutes": "integer"
  }
  ```
- **Response:**
  ```json
  {
    "id": "integer",
    "username": "string",
    "email": "string",
    "exerciseGoalMinutes": "integer",
    "waterGoalOz": "integer",
    "meditationGoalMinutes": "integer",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
  ```

#### POST /users/login 
make sure to add demo userrrrr***
**Description:** Log in an existing user.
- **Request Body:**
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response:**
  ```json
  {
    "token": "string"
  }
  ```

#### GET /users/{id}
**Description:** Get user details.
- **Response:**
  ```json
  {
    "id": "integer",
    "username": "string",
    "email": "string",
    "exerciseGoalMinutes": "integer",
    "waterGoalOz": "integer",
    "meditationGoalMinutes": "integer",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
  ```

### Workouts

#### POST /workouts/new
**Description:** Log a workout.
- **Request Body:**
  ```json
  {
    "userId": "integer",
    "date": "date",
    "durationMinutes": "integer"
  }
  ```
- **Response:**
  ```json
  {
    "id": "integer",
    "userId": "integer",
    "date": "date",
    "durationMinutes": "integer",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
  ```

#### GET /workouts/{userId}
**Description:** Get all workouts for a user.
- **Response:**
  ```json
  [
    {
      "id": "integer",
      "userId": "integer",
      "date": "date",
      "durationMinutes": "integer",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ]
  ```

### Water Intake

#### POST /waterintake/new
**Description:** Log water intake.
- **Request Body:**
  ```json
  {
    "userId": "integer",
    "date": "date",
    "waterConsumedOz": "integer"
  }
  ```
- **Response:**
  ```json
  {
    "id": "integer",
    "userId": "integer",
    "date": "date",
    "waterConsumedOz": "integer",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
  ```

#### GET /waterintake/{userId}
**Description:** Get all water intake records for a user.
- **Response:**
  ```json
  [
    {
      "id": "integer",
      "userId": "integer",
      "date": "date",
      "waterConsumedOz": "integer",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ]
  ```

### Meditation Sessions

#### POST /meditationsessions/new
**Description:** Log a meditation session.
- **Request Body:**
  ```json
  {
    "userId": "integer",
    "date": "date",
    "durationMinutes": "integer"
  }
  ```
- **Response:**
  ```json
  {
    "id": "integer",
    "userId": "integer",
    "date": "date",
    "durationMinutes": "integer",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
  ```

#### GET /meditationsessions/{userId}
**Description:** Get all meditation sessions for a user.
- **Response:**
  ```json
  [
    {
      "id": "integer",
      "userId": "integer",
      "date": "date",
      "durationMinutes": "integer",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ]


### History

#### GET /history/{userId}
**Description:** Get a history of all logged workouts and meditation sessions for a user.
- **Response:**
  ```json
  [
    {
      "type": "Workout",
      "date": "date",
      "durationMinutes": "integer"
    },
    {
      "type": "MeditationSession",
      "date": "date",
      "durationMinutes": "integer"
    }
  ]
  ```

  ```

