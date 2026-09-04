import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const createWatchlist = (userId, name) =>
  axios.post(`${API_URL}/watchlists`, { userId, name }).then((r) => r.data);

export const addSymbol = (watchlistId, symbol) =>
  axios.post(`${API_URL}/watchlists/${watchlistId}/items`, { symbol }).then((r) => r.data);

export const removeSymbol = (watchlistId, symbol) =>
  axios.delete(`${API_URL}/watchlists/${watchlistId}/items/${symbol}`).then((r) => r.data);

export const getFeed = (watchlistId) =>
  axios.get(`${API_URL}/watchlists/${watchlistId}/feed`).then((r) => r.data);