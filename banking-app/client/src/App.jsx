import Index from "./pages/Index.jsx";
import NotFound from "./pages/NotFound";
import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
    <Routes>
      <Route path = "/" element = {<Index/>}/>
      <Route path = "*" element = {<NotFound/>}/>
    </Routes>
      </BrowserRouter>
  )
}

export default App
