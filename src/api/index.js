import { apiGet, apiPost, apiPut, apiDelete } from './client'

export const signIn = (data) => apiPost('/signIn', data)

export const getOrders = () => apiGet('/getOrders')
export const createOrder = (data) => apiPost('/createOrders', data)
export const updateOrder = (id, data) => apiPut(`/updateOrder/${id}`, data)
export const deleteOrder = (id) => apiDelete(`/deleteOrder/${id}`)

export const createOrderItem = (data) => apiPost('/createOrderItems', data)

export const getProducts = () => apiGet('/getProducts')
export const createProduct = (data) => apiPost('/createProducts', data)
export const updateProduct = (id, data) => apiPut(`/updateProduct/${id}`, data)
export const deleteProduct = (id) => apiDelete(`/deleteProduct/${id}`)

export const getCategories = () => apiGet('/getCategories')
export const createCategory = (data) => apiPost('/createCategories', data)
export const updateCategory = (id, data) => apiPut(`/updateCategorie/${id}`, data)
export const deleteCategory = (id) => apiDelete(`/deleteCategorie/${id}`)

export const getNotes = () => apiGet('/getNotes')
export const createNote = (data) => apiPost('/createNotes', data)
export const updateNote = (id, data) => apiPut(`/updateNote/${id}`, data)
export const deleteNote = (id) => apiDelete(`/deleteNote/${id}`)
