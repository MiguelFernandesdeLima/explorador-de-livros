// Variáveis globais
let currentPage = 1;
const booksPerPage = 10;
let totalItems = 0;
let currentQuery = '';
let currentCategory = '';
let currentSort = 'relevance';
let currentPrintType = 'all';

// Elementos DOM
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const categoryFilter = document.getElementById('category-filter');
const sortBy = document.getElementById('sort-by');
const printType = document.getElementById('print-type');
const booksContainer = document.getElementById('books-container');
const loadingSpinner = document.getElementById('loading-spinner');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');
const resultsInfo = document.getElementById('results-info');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Pesquisa inicial com livros populares
    searchBooks('javascript', true);
});

searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
        currentPage = 1;
        currentQuery = query;
        searchBooks(query);
    }
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
            currentPage = 1;
            currentQuery = query;
            searchBooks(query);
        }
    }
});

categoryFilter.addEventListener('change', () => {
    currentCategory = categoryFilter.value;
    currentPage = 1;
    searchBooks(currentQuery || 'javascript');
});

sortBy.addEventListener('change', () => {
    currentSort = sortBy.value;
    currentPage = 1;
    searchBooks(currentQuery || 'javascript');
});

printType.addEventListener('change', () => {
    currentPrintType = printType.value;
    currentPage = 1;
    searchBooks(currentQuery || 'javascript');
});

prevPageBtn.addEventListener('click', goToPrevPage);
nextPageBtn.addEventListener('click', goToNextPage);

// Função principal para buscar livros
async function searchBooks(query, initialLoad = false) {
    if (!query && !initialLoad) return;

    try {
        loadingSpinner.classList.add('active');
        booksContainer.innerHTML = '';

        let apiUrl = `https://www.googleapis.com/books/v1/volumes?q=`;
        
        // Adiciona query de busca
        if (initialLoad) {
            apiUrl += query; // Para a busca inicial
        } else {
            apiUrl += encodeURIComponent(query);
        }

        // Adiciona filtro de categoria se selecionado
        if (currentCategory && !initialLoad) {
            apiUrl += `+subject:${encodeURIComponent(currentCategory)}`;
        }

        // Adiciona parâmetros de ordenação e tipo
        apiUrl += `&orderBy=${currentSort}`;
        apiUrl += `&printType=${currentPrintType}`;
        
        // Adiciona paginação
        apiUrl += `&startIndex=${(currentPage - 1) * booksPerPage}`;
        apiUrl += `&maxResults=${booksPerPage}`;
        apiUrl += `&langRestrict=pt`; // Prioriza resultados em português

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error('Falha ao carregar os livros');
        }
        
        const data = await response.json();
        totalItems = data.totalItems || 0;
        
        displayResultsInfo(totalItems, query);
        
        if (data.items && data.items.length > 0) {
            displayBooks(data.items);
        } else {
            booksContainer.innerHTML = `
                <div class="no-results">
                    <p>Nenhum livro encontrado com os critérios atuais.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erro ao buscar livros:', error);
        booksContainer.innerHTML = `
            <div class="error-message">
                <p>Ocorreu um erro ao carregar os livros. Por favor, tente novamente mais tarde.</p>
            </div>
        `;
    } finally {
        loadingSpinner.classList.remove('active');
        updatePagination();
    }
}

// Função para exibir informações dos resultados
function displayResultsInfo(total, query) {
    if (total === 0) {
        resultsInfo.textContent = 'Nenhum resultado encontrado';
        return;
    }

    const startItem = (currentPage - 1) * booksPerPage + 1;
    const endItem = Math.min(currentPage * booksPerPage, total);
    
    resultsInfo.textContent = query 
        ? `Mostrando ${startItem}-${endItem} de ${total} resultados para "${query}"`
        : `Mostrando ${startItem}-${endItem} de ${total} livros encontrados`;
}

// Função para exibir os livros
function displayBooks(books) {
    booksContainer.innerHTML = '';
    
    books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        
        const volumeInfo = book.volumeInfo || {};
        const title = volumeInfo.title || 'Título desconhecido';
        const authors = volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Autor desconhecido';
        const publishedDate = volumeInfo.publishedDate || 'Data desconhecida';
        const categories = volumeInfo.categories || ['Sem categoria'];
        const imageLinks = volumeInfo.imageLinks || {};
        const thumbnail = imageLinks.thumbnail || imageLinks.smallThumbnail;
        
        bookCard.innerHTML = `
            ${thumbnail 
                ? `<img src="${thumbnail.replace('http://', 'https://')}" alt="${title}" class="book-cover">`
                : `<div class="no-cover">Capa indisponível<br>${title}</div>`
            }
            <div class="book-info">
                <h3 class="book-title">${title}</h3>
                <p class="book-authors">${authors}</p>
                <p class="book-published">Publicado em: ${publishedDate}</p>
                <div class="book-categories">
                    ${categories.slice(0, 2).map(cat => 
                        `<span class="category-tag">${cat}</span>`
                    ).join('')}
                </div>
            </div>
        `;
        
        booksContainer.appendChild(bookCard);
    });
}

// Funções de paginação
function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        searchBooks(currentQuery);
    }
}

function goToNextPage() {
    const totalPages = Math.ceil(totalItems / booksPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        searchBooks(currentQuery);
    }
}

function updatePagination() {
    const totalPages = Math.ceil(totalItems / booksPerPage) || 1;
    
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalItems === 0;
    
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
}

window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        loadMoreBooks();
    }
});

function toggleFavorite(bookId) {
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    const index = favorites.indexOf(bookId);
    
    if (index === -1) {
        favorites.push(bookId);
    } else {
        favorites.splice(index, 1);
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

searchInput.addEventListener('input', debounce(fetchSuggestions, 300));

function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}