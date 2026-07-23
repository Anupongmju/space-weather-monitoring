import API_BASE from '../config'

const BASE = `${API_BASE}/news`

export interface NewsArticle {
  id?: number;
  title: string;
  content: string;
  image_url?: string;
  created_at?: string;
}

export const getNews = async (): Promise<NewsArticle[]> => {
  const res = await fetch(BASE)
  return res.json()
}

export const getNewsById = async (id: string | number): Promise<NewsArticle> => {
  const res = await fetch(`${BASE}/${id}`)
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.detail || 'Failed to fetch news article')
  }
  return res.json()
}

export const createNews = async (article: NewsArticle, adminPassword: string): Promise<NewsArticle> => {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': adminPassword,
    },
    body: JSON.stringify(article),
  })
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.detail || 'Failed to create news article')
  }
  return res.json()
}

export const deleteNews = async (id: string | number, adminPassword: string): Promise<any> => {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'DELETE',
    headers: {
      'X-Admin-Password': adminPassword,
    },
  })
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.detail || 'Failed to delete news article')
  }
  return res.json()
}

export const updateNews = async (id: string | number, article: NewsArticle, adminPassword: string): Promise<NewsArticle> => {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': adminPassword,
    },
    body: JSON.stringify(article),
  })
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.detail || 'Failed to update news article')
  }
  return res.json()
}

export const uploadImageToImgBB = async (file: File): Promise<string> => {
  const apiKey = import.meta.env.VITE_IMGBB_API_KEY
  if (!apiKey || apiKey === 'your_imgbb_api_key_here') {
    throw new Error('Please configure VITE_IMGBB_API_KEY in your frontend/.env file.')
  }
  const formData = new FormData()
  formData.append('image', file)
  
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData,
  })
  const data = await res.json()
  if (data && data.success && data.data && data.data.url) {
    return data.data.url
  }
  throw new Error(data?.error?.message || 'Failed to upload image to ImgBB')
}
