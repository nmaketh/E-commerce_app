 SmartShop – Product Discovery & Comparison App

SmartShop is a modern web application that allows users to search, filter, sort, and compare products from an external e-commerce API. It provides a clean, intuitive interface, dynamic comparison features, and detailed product insights.

The application is designed for real practical use, focusing on helping users make informed purchasing decisions through live API data, advanced filtering, and side-by-side product comparison.

SmartShop is developed locally, deployed on two web servers (Web01 & Web02), and served through a Load Balancer (Lb01) for redundancy, scalability, and high availability.
<img width="1240" height="599" alt="Skermskoot 2025-11-23 125540" src="https://github.com/user-attachments/assets/5f747420-7968-47f6-ad9a-b1a011502849" />

 Features
Product Search

Search for any product (e.g., “iPhone”, “Laptop”, “Shoes”) using live API data.


Advanced Filtering

Filter products by:

Price range

Product rating

Store availability

Category

Sorting Options

Sort results by:

Lowest price

Highest price

Rating

Relevance

Product Comparison Tool

Select up to three products and compare them side-by-side using a dynamic comparison modal.

The comparison includes:

Title

Image

Price

Rating

Store/platform

Description

Product links

Robust Error Handling

SmartShop gracefully handles:

API downtime

No internet

Invalid search queries

Rate-limit issues

Failed responses

Fast and Responsive UI

Built with clean HTML, CSS, and JavaScript, optimized for user experience.


Tech Stack
Layer	Technology
Frontend	HTML5, CSS3, JavaScript
Backend	Node.js + Express
API Calls	Axios
Deployment	Ubuntu web servers (Web01 & Web02)
Reverse Proxy	Nginx
Load Balancing	Nginx (Lb01)
Env Management	dotenv

 External API Used

SmartShop uses a live external product database API:

API Provider: Your API Name Here
Documentation: Add official API link here


API Key and sensitive values are stored securely in .env and never committed to GitHub.

Environment Variables

Create a .env file in the project root:

API_URL=https://api.example.com/products/search
API_KEY=your_api_key_here
PORT=3000


 .env is included in .gitignore and is not pushed to GitHub.

You must provide your actual keys in the assignment comment section, per instructions.

▶️ Running SmartShop Locally
1️⃣ Clone the repository:
git clone https://github.com/nmaketh/E-commerce_app.git
cd ecommerce_lookup

2️⃣ Install backend dependencies:
npm install

3️⃣ Add your .env file in the root folder.
4️⃣ Start the server:
npm start

5️⃣ Open SmartShop in the Browser:
http://localhost:3000

🌐 Deployment Instructions (Web01 & Web02)

SmartShop is deployed on two separate servers for redundancy.

1️⃣ SSH into each server:
ssh user@Web01_IP
ssh user@Web02_IP

2️⃣ Clone the repository:
git clone https://github.com/nmaketh/E-commerce_app.git
cd ecommerce_lookup

3️⃣ Install dependencies:
npm install

4️⃣ Create .env file on each server:
API_URL=...
API_KEY=...
PORT=3000

5️⃣ Start application using PM2 (recommended):
npm install -g pm2
pm2 start server.js --name smartshop
pm2 save
pm2 startup

Nginx Configuration (Web01 & Web02)

/etc/nginx/sites-available/smartshop

server {
    listen 80;
    server_name _;

    root /var/www/smartshop/public;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location /api/ {
        proxy_pass http://localhost:3000/api/;
    }
}


Enable and restart:

sudo ln -s /etc/nginx/sites-available/smartshop /etc/nginx/sites-enabled/
sudo systemctl restart nginx

Load Balancer Configuration (Lb01)

/etc/nginx/sites-available/lb-smartshop

upstream smartshop_backend {
    server Web01_private_IP:80;
    server Web02_private_IP:80;
}

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://smartshop_backend;
    }
}


Enable and restart:

sudo ln -s /etc/nginx/sites-available/lb-smartshop /etc/nginx/sites-enabled/
sudo systemctl restart nginx

Testing the Load Balancer

Visit:

http://<Lb01 Public IP>/


Refresh several times

Each refresh may hit Web01 or Web02

Confirm both servers return identical output

Verify API calls work through the balancer

Demo Video Guide (≤ 2 minutes)

Your video should show:

Local run of SmartShop

Searching for a product

Filtering (price + rating)

Sorting

Adding products to comparison

Opening comparison modal

Showing error message (optional)

Going to Load Balancer URL

Confirming the app is live on the web

Challenges & Solutions
🔹 API reliability

The external API sometimes failed or timed out.
Added full error handling with user-friendly messages.

🔹 CORS issues

Solved using Express backend proxying all API requests.

🔹 Deployment consistency

Ensured both Web01 and Web02 mirrored the same folder structure and .env keys.

🔹 Load balancing

Implemented round-robin balancing with Nginx for even traffic distribution.

Credits

API Provider: Name of External API

Nginx Documentation: https://nginx.org

Express JS: https://expressjs.com/

Node.js Runtime

Assignment brief provided by university

📄 License

This project is developed for academic use under ALU.
