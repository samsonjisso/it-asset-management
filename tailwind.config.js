/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/app/**/*.{js,ts,jsx,tsx}','./src/components/**/*.{js,ts,jsx,tsx}','./src/views/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {
    colors: { brand: { 50:'#f5f5fc',100:'#e8e8f8',200:'#dadaf1',300:'#b9b9e0',400:'#7777cc',500:'#4e4ec1',600:'#343494',700:'#2b2b7d',800:'#242467',900:'#1b1b4d',950:'#11112f' }, gold:{300:'#ffd53d',400:'#ffc800',500:'#e6b300'} },
    boxShadow: { soft:'0 4px 14px rgba(52,52,148,.12)', card:'0 8px 24px rgba(0,0,0,.12)', lift:'0 10px 30px rgba(0,0,0,.14)' }
  }},
  plugins: [],
};
