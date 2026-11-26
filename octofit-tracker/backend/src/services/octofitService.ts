import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

type ActivityInput = {
  userId?: unknown;
  teamId?: unknown;
  type?: unknown;
  minutes?: unknown;
};

type TeamInput = {
  name?: unknown;
  mascot?: unknown;
  members?: unknown;
};

function serviceError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  if (!isRecord(input)) throw serviceError(400, 'Activity details are required');
  const { userId, teamId, type, minutes } = input as ActivityInput;
  if (
    typeof userId !== 'string'
    || !mongoose.isValidObjectId(userId)
    || typeof teamId !== 'string'
    || !mongoose.isValidObjectId(teamId)
    || typeof type !== 'string'
    || type.trim().length === 0
    || typeof minutes !== 'number'
    || !Number.isFinite(minutes)
    || minutes < 1
  ) {
    throw serviceError(400, 'A valid user, team, activity type, and positive number of minutes are required');
  }

  const [user, team] = await Promise.all([User.exists({ _id: userId }), Team.exists({ _id: teamId })]);
  if (!user || !team) throw serviceError(404, 'The selected user or team does not exist');

  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().sort({ name: 1 }).lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input)) throw serviceError(400, 'Team details are required');
  const { name, mascot, members } = input as TeamInput;
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw serviceError(400, 'A team name is required');
  }
  if (typeof mascot !== 'string' || mascot.trim().length === 0) {
    throw serviceError(400, 'A team mascot is required');
  }
  if (members !== undefined && !Array.isArray(members)) {
    throw serviceError(400, 'Team members must be an array of user IDs');
  }

  const memberIds = [...new Set((members ?? []).map((member: unknown) => {
    if (typeof member !== 'string' || !mongoose.isValidObjectId(member)) {
      throw serviceError(400, 'Team members must be valid user IDs');
    }
    return member;
  }))];
  if (memberIds.length > 0) {
    const existingMembers = await User.countDocuments({ _id: { $in: memberIds } });
    if (existingMembers !== memberIds.length) throw serviceError(404, 'One or more team members do not exist');
  }

  return Team.create({ name: name.trim(), mascot: mascot.trim(), members: memberIds });
}

export async function getLeaderboard() {
  const [teams, activityTotals] = await Promise.all([
    Team.find().select('name').lean(),
    Activity.aggregate<{ _id: mongoose.Types.ObjectId; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const totalsByTeam = new Map(activityTotals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));
  return teams
    .map((team) => ({ teamName: team.name, totalPoints: totalsByTeam.get(team._id.toString()) ?? 0 }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

function focusForActivity(type: string) {
  const normalizedType = type.toLowerCase();
  if (['run', 'running', 'cycle', 'cycling', 'swim', 'swimming'].includes(normalizedType)) return 'endurance';
  if (['strength', 'weights', 'weight training'].includes(normalizedType)) return 'strength';
  if (['yoga', 'mobility', 'stretching'].includes(normalizedType)) return 'mobility';
  if (['walk', 'walking', 'recovery'].includes(normalizedType)) return 'recovery';
  return normalizedType;
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).select('_id fitnessGoal').lean();
  if (!user) throw serviceError(404, 'No user was found with that email address');

  const recentActivities = await Activity.find({ user: user._id })
    .sort({ occurredAt: -1 })
    .limit(10)
    .select('type')
    .lean();
  const recentType = recentActivities[0]?.type;
  const recentFocus = recentType ? focusForActivity(recentType) : undefined;
  const focusPriority = [...new Set([user.fitnessGoal.toLowerCase(), recentFocus].filter((focus): focus is string => Boolean(focus)))];
  const workouts = await Workout.find({ focus: { $in: focusPriority } }).lean();
  const priorityByFocus = new Map(focusPriority.map((focus, index) => [focus, index]));

  return workouts
    .sort((left, right) => (priorityByFocus.get(left.focus) ?? Number.MAX_SAFE_INTEGER) - (priorityByFocus.get(right.focus) ?? Number.MAX_SAFE_INTEGER))
    .map((workout) => ({
      ...workout,
      reason: recentFocus === workout.focus && recentType
        ? `Recommended based on your recent ${recentType} activity and ${user.fitnessGoal} goal.`
        : `Recommended to support your ${user.fitnessGoal} goal.`,
    }));
}

export { User };
