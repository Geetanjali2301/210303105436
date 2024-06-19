const express= require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 9876;
const TEST_SERVER_URL = 'http://20.244.56.144/test';
const COMPANIES = ['AMZ', 'FLP', 'SNP', 'MYN', 'AZO'];
const MAX_PRODUCTS_PER_PAGE = 10;

const fetchProductsFromServer = async (company, category) => {
    try {
        const response = await axios.get(`${TEST_SERVER_URL}/products`, {
            params: { company, category },
            timeout: 500,
        });
        return response.data.products || [];
    } catch (error) {
        console.error(`Error fetching products for ${company}:`, error.message);
        return [];
    }
};

const getAggregatedProducts = async (category) => {
    let allProducts = [];
    for (const company of COMPANIES) {
        const products = await fetchProductsFromServer(company, category);
        allProducts = allProducts.concat(products);
    }
    const uniqueProducts = Array.from(new Set(allProducts.map(p => p.id))).map(id => {
        return allProducts.find(p => p.id === id);
    });
    return uniqueProducts;
};

const sortProducts = (products, sortBy, sortOrder) => {
    if (!sortBy) return products;
    return products.sort((a, b) => {
        if (sortOrder === 'desc') {
            return b[sortBy] - a[sortBy];
        } else {
            return a[sortBy] - b[sortBy];
        }
    });
};

const generateProductIds = (products) => {
    return products.map(product => ({
        ...product,
        customId: uuidv4(),
    }));
};

// GET Request for '/categories/:category/products'
app.get('/categories/:category/products', async (req, res) => {
    const { category } = req.params;
    const { n = 10, page = 1, sortBy, sortOrder = 'asc' } = req.query;
    const numProducts = parseInt(n);
    const pageNumber = parseInt(page);

    if (numProducts > MAX_PRODUCTS_PER_PAGE && !req.query.page) {
        return res.status(400).json({ error: 'Pagination required for more than 10 products' });
    }

    const allProducts = await getAggregatedProducts(category);
    const sortedProducts = sortProducts(allProducts, sortBy, sortOrder);
    const paginatedProducts = sortedProducts.slice((pageNumber - 1) * numProducts, pageNumber * numProducts);
    const productsWithIds = generateProductIds(paginatedProducts);

    res.json({
        products: productsWithIds,
        total: allProducts.length,
        currentPage: pageNumber,
        totalPages: Math.ceil(allProducts.length / numProducts),
        perPage: numProducts,
    });
});

// GET Request for '/categories/:category/products/:productid'
app.get('/categories/:category/products/:productid', async (req, res) => {
    const { category, productid } = req.params;
    const allProducts = await getAggregatedProducts(category);
    const product = allProducts.find(p => p.customId === productid);

    if (!product) {
        return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
})