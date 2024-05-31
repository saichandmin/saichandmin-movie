const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'moviesData.db')
let db = null

const convertDbObjectToResponseObjectMovie = dbObject => {
  return {
    movieId: dbObject.movie_id,
    directorId: dbObject.director_id,
    movieName: dbObject.movie_name,
    leadActor: dbObject.lead_actor,
  }
}

const convertDirectorDetailsCamelCase = dbObject => {
  const directorDetails = {
    directorId: dbObject.director_id,
    directorName: dbObject.director_name,
  }

  return _.mapKeys({...dbObject, ...directorDetails}, (value, key) =>
    _.camelCase(key),
  )
}

const intilizeDatabaseAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`Db Error ${e.message}`)
    process.exit(1)
  }
}

intilizeDatabaseAndServer()

app.get('/movies/', async (request, response) => {
  const {page = 1, limit = 10} = request.query

  const getMoviesQuery = `
    SELECT
      movie_name
    FROM
      movie
    LIMIT ${limit} OFFSET ${(page - 1) * limit};
  `

  const movies = await db.all(getMoviesQuery)

  if (movies.length === 0) {
    response.status(404).send('No movies found')
  } else {
    const movieList = movies.map(movie => ({movieName: movie.movie_name}))
    response.send(movieList)
  }
})
app.get('/movies/:movieId/', async (request, response) => {
  const {movieId} = request.params
  const getMovieQuerry = `
      SELECT
      *
      FROM
      movie
      WHERE
      movie_id=${movieId};`
  const movie = await db.get(getMovieQuerry)
  if (!movie) {
    response.status(404).send('Movie not found')
  } else {
    response.send(convertDbObjectToResponseObjectMovie(movie))
  }
})

app.post('/movies/', async (request, response) => {
  const movieDetails = request.body
  const {directorId, movieName, leadActor} = movieDetails
  const addMovieQuerry = `
INSERT INTO
movie (director_id,movie_name,lead_actor)
Values(${directorId},'${movieName}','${leadActor}')
`
  await db.run(addMovieQuerry)
  response.send('Movie Successfully Added')
})

app.put('/movies/:movieId/', async (request, response) => {
  const {movieId} = request.params
  const movieDetails = request.body
  const {directorId, movieName, leadActor} = movieDetails
  const updateMovieQuerry = `
UPDATE
movie
SET
director_id=${directorId},movie_name='${movieName}',lead_actor='${leadActor}'
WHERE
movie_id=${movieId};
`
  await db.run(updateMovieQuerry)
  response.send('Movie Details Updated')
})

app.delete('/movies/:movieId/', async (request, response) => {
  const {movieId} = request.params
  const deleteMovieQuerry = `
DELETE 
FROM
movie
WHERE
movie_id=${movieId};`
  await db.run(deleteMovieQuerry)
  response.send('Movie Removed')
})

app.get('/directors/', async (request, response) => {
  const getAllDirectorQuerry = `
    SELECT
      *
    FROM
      director;`
  const directorsArray = await db.all(getAllDirectorQuerry)
  response.send(directorsArray.map(convertDirectorDetailsCamelCase))
})

app.get('/directors/:directorId/movies/', async (request, response) => {
  const {directorId} = request.params
  const getAllDirectorQuerry = `
    SELECT
      movie_name
    FROM
      director INNER JOIN movie
    ON director.director_id=movie.director_id
    WHERE
      director.director_id=${directorId};`
  const movies = await db.all(getAllDirectorQuerry)
  response.send({
    message: 'Movies directed by the director retrieved successfully',
    data: movies,
  })
})

module.exports = app


