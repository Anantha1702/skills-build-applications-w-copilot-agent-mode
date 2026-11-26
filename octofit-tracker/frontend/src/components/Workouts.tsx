import { useApiResource } from '../api/useApiResource.js';

type WorkoutSuggestion = {
  _id?: string;
  title: string;
  focus: string;
  minutes: number;
  difficulty: string;
  reason: string;
};

export default function Workouts() {
  const userEmail = 'mona@example.com';
  const { data, loading, error } = useApiResource<{ suggestions: WorkoutSuggestion[] }>(
    `/api/workouts/suggestions/${encodeURIComponent(userEmail)}`,
  );
  const suggestions = data?.suggestions ?? [];

  return (
    <section className="card">
      <div className="card-body">
        <h2 className="h4">Workout suggestions</h2>
        <p>Recommend workouts from activity patterns.</p>
        {loading && <p role="status">Loading workout suggestions...</p>}
        {error && <p role="alert">Unable to load workout suggestions: {error}</p>}
        {!loading && !error && suggestions.length === 0 && <p>No workout suggestions yet.</p>}
        {!loading && !error && suggestions.length > 0 && (
          <ul className="list-group">
            {suggestions.map((workout, index) => (
              <li className="list-group-item" key={workout._id ?? `${workout.title}-${index}`}>
                <h3 className="h5">{workout.title}</h3>
                <p>{workout.focus} · {workout.minutes} minutes · {workout.difficulty}</p>
                <p>{workout.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
