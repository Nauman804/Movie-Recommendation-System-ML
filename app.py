from flask import Flask, request, jsonify, send_from_directory
import joblib
import pandas as pd
import os
import sys

# Get the absolute path to the project directory
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, static_folder=PROJECT_DIR, static_url_path='')

# Configuration
DATA_DIR = r'D:\PROJECTS\moive\data'

# Load models
try:
    movies_df = joblib.load(os.path.join(DATA_DIR, 'movies_data.pkl'))
    cosine_sim = joblib.load(os.path.join(DATA_DIR, 'cosine_similarity.pkl'))
    tfidf_vectorizer = joblib.load(os.path.join(DATA_DIR, 'tfidf_vectorizer.pkl'))
    print("✅ Models loaded successfully!")
except FileNotFoundError as e:
    print(f"❌ Error loading models: {e}")
    sys.exit(1)

class ContentBasedRecommender:
    def __init__(self, movies_df, similarity_matrix):
        self.movies_df = movies_df
        self.similarity_matrix = similarity_matrix
    
    def get_recommendations(self, movie_title, n_recommendations=5):
        """Get recommendations for a given movie"""
        # Find the movie
        matches = self.movies_df[self.movies_df['title'].str.contains(movie_title, case=False, na=False)]
        
        if matches.empty:
            return []
        
        movie_idx = matches.index[0]
        
        # Get similarity scores
        sim_scores = sorted(
            enumerate(self.similarity_matrix[movie_idx]),
            key=lambda x: x[1],
            reverse=True
        )[1:n_recommendations+1]
        
        # Build recommendations
        recommendations = []
        for idx, score in sim_scores:
            movie = self.movies_df.iloc[idx]
            recommendations.append({
                'title': movie['title'],
                'genre': movie['Genre'],
                'rating': float(movie['Rating']),
                'votes': int(movie['Votes']),
                'similarity_score': float(score)
            })
        
        return recommendations

# Initialize recommender
recommender = ContentBasedRecommender(movies_df, cosine_sim)

@app.route('/', methods=['GET'])
def index():
    """Serve the main web app"""
    return send_from_directory(PROJECT_DIR, 'index.html')

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'total_movies': len(movies_df),
        'model_loaded': True
    }), 200

@app.route('/recommend', methods=['GET'])
def recommend():
    """Get recommendations for a movie"""
    movie_title = request.args.get('movie', '')
    n = request.args.get('n', 5, type=int)
    
    if not movie_title:
        return jsonify({'error': 'Movie title is required'}), 400
    
    recommendations = recommender.get_recommendations(movie_title, n)
    
    if not recommendations:
        return jsonify({
            'error': f'No movie found matching "{movie_title}"',
            'suggested_search': 'Try searching with partial movie titles'
        }), 404
    
    return jsonify({
        'query_movie': movie_title,
        'num_recommendations': len(recommendations),
        'recommendations': recommendations
    }), 200

@app.route('/search', methods=['GET'])
def search():
    """Search for movies by title or genre"""
    query = request.args.get('q', '')
    limit = request.args.get('limit', 10, type=int)
    search_by = request.args.get('by', 'title')  # 'title' or 'genre'
    
    if not query:
        return jsonify({'error': 'Search query is required'}), 400
    
    if search_by == 'genre':
        results = movies_df[movies_df['Genre'].str.contains(query, case=False, na=False)]
    else:
        results = movies_df[movies_df['title'].str.contains(query, case=False, na=False)]
    
    results = results.head(limit)
    
    search_results = []
    for _, movie in results.iterrows():
        search_results.append({
            'title': movie['title'],
            'genre': movie['Genre'],
            'rating': float(movie['Rating']),
            'votes': int(movie['Votes'])
        })
    
    return jsonify({
        'query': query,
        'search_by': search_by,
        'total_results': len(search_results),
        'results': search_results
    }), 200

@app.route('/stats', methods=['GET'])
def stats():
    """Get database statistics"""
    return jsonify({
        'total_movies': len(movies_df),
        'avg_rating': float(movies_df['Rating'].mean()),
        'avg_votes': int(movies_df['Votes'].mean()),
        'rating_range': {
            'min': float(movies_df['Rating'].min()),
            'max': float(movies_df['Rating'].max())
        }
    }), 200

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🎬 Movie Recommendation System - Flask API")
    print("="*60)
    print(f"📊 Loaded {len(movies_df)} movies")
    print("\n📡 Available Endpoints:")
    print("  GET /health           - Health check")
    print("  GET /recommend        - Get recommendations")
    print("  GET /search           - Search movies")
    print("  GET /stats            - Database statistics")
    print("\n🚀 Server starting on http://localhost:5000")
    print("="*60 + "\n")
    
    app.run(debug=False, host='localhost', port=5000)
