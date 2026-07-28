// Data layer for the Admin Dashboard analytics charts — kept separate from
// the chart components so presentation code never calls the API directly.
import API from "./axios";

export const getRevenueTrend = () =>
  API.get("/revenue/trend").then((res) => res.data.trend);

export const getWeeklyPerformance = () =>
  API.get("/revenue/weekly").then((res) => res.data.weekly);

export const getTopMeals = () =>
  API.get("/revenue/top-meals").then((res) => res.data.topMeals);