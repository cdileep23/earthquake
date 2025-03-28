import axios from "axios"
import express, { response } from "express"
import rateLimit from "express-rate-limit";
import { createClient } from 'redis';


const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { success: false, message: "Too many requests, please try again later." }
});


const app=express()


const port=8000
const client = createClient();

client.on('error', err => console.log('Redis Client Error', err));

await client.connect();
app.use(limiter);


app.get('/',(req,res)=>{
    res.send("hello from internbit")
})



  
app.get('/earthquakes', async (req, res) => {
    try {
        const { starttime, endtime, magnitude } = req.query;
      
        function formatDate(dateString) {
            if (!dateString) return null;
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return null;
            return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
        }

        const newStartTime = formatDate(starttime);
        const newEndTime = formatDate(endtime);

      
        const cacheKeyParts = [
            "earthquakeKey",
            newStartTime ? `st-${newStartTime}` : "",
            newEndTime ? `et-${newEndTime}` : "",
            magnitude ? `m-${magnitude}` : ""
        ].filter(Boolean).join('-'); 

        console.log("Cache Key:", cacheKeyParts);

        
        const cachedData = await client.get(cacheKeyParts);
        if (cachedData) {
            return res.status(200).json({ success: true, data: JSON.parse(cachedData), source: "cache" });
        }

        console.log("Fetching fresh data...");

       
        const baseUrl = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson";
        const queryParams = new URLSearchParams();

        if (newStartTime) queryParams.append("starttime", newStartTime);
        if (newEndTime) queryParams.append("endtime", newEndTime);
        if (magnitude) queryParams.append("minmagnitude", magnitude);

        const apiUrl = `${baseUrl}&${queryParams.toString()}`;
        console.log("Request URL:", apiUrl);

     
        const response = await axios.get(apiUrl);

      
        await client.setEx(cacheKeyParts, 600, JSON.stringify(response.data));

        res.status(200).json({ success: true, data: response.data });

    } catch (error) {
        console.error("Error fetching earthquakes:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

app.get('/earthquakes/:id',async(req,res)=>{
    try {
        const {id}=req.params;

        const cacheKey=`earthquakes${id}`


  const cachedData = await client.get(cacheKey);
        if (cachedData) {
            return res.status(200).json({ success: true, data: JSON.parse(cachedData), source: "cache" });
        }
        console.log("after caching")
        const response=await axios.get(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&eventid=${id}`)
       
        await client.setEx(cacheKey, 600, JSON.stringify(response.data));
        res.status(200).json({
            success:true,data:response.data
        })

        
    } catch (error) {
        console.log(error)
    }
})

app.listen(port,()=>{
    console.log(`server started at ${port}`)
})