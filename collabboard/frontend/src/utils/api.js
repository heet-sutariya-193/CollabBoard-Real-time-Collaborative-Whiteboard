const API_BASE_URL = 'https://collabboard-real-time-collaborative.onrender.com/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const api = {
    async get(endpoint) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: getAuthHeaders()
        });
        return response.json();
    },

    async post(endpoint, data) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(data),
        });
        return response.json();
    },

    async put(endpoint, data) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        return response.json();
    },

    async delete(endpoint) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
        });
        return response.json();
    }
};

// Specific API functions for saved boards
export const savedBoardsAPI = {
    async getSavedBoards(userId) {
        return api.get(`/saved-boards/${userId}`);
    },

    async saveBoard(boardData) {
        return api.post('/saved-boards', boardData);
    },

    async deleteBoard(boardId) {
        return api.delete(`/saved-boards/${boardId}`);
    }
};
