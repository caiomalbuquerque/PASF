// assets/js/supabase-client.js
// Substitua pelas suas credenciais do Supabase
const SUPABASE_URL = 'https://ikrfppuhtsbphejzojdd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrcmZwcHVodHNicGhlanpvamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyODExMzAsImV4cCI6MjEwODg1NzEzMH0.CrWOHHOQ6S7GRoMhnrl1ATqRUy6FZvalAwluLxUAKjE';

// Cria o cliente global do Supabase
window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
