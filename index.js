const express = require('express')
const ejs = require('ejs')
const path = require('path')
const expresslayouts = require('express-ejs-layouts')
const session = require('express-session');
const bodyparser = require('body-parser')
const fileupload = require('express-fileupload')
const mongoclient = require('mongodb').MongoClient;
const bodyParser = require('body-parser');

var nodemailer = require('nodemailer');
var fs=require('fs')


var app = express()


var transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    auth: {
        user: 'cake.shop.valsad@gmail.com',
        pass: 'phzskgmpudzcmyfx'
    }
});

app.set('views', path.join(__dirname, '/view/'))
app.set('view engine', 'ejs')
app.set('layout', 'layouts/mainlayouts')
app.use(expresslayouts);

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.json());
app.use(express.urlencoded());
app.use(bodyparser.json());
app.use(fileupload());
app.use(express.static(__dirname + "/public"))
app.use(session({ secret: 'hello' }));
app.use(function (req, res, next) {
    res.locals.session = req.session;
    next();
});
var url = "mongodb://127.0.0.1:27017/Cake_Shop";
app.use('/admin', express.static('public/admin'));
var customer_detail_collection = "";
var cat_detail_collection = "";
var cake_detail_collection = "";
var cart_detail_collection = "";
var order_detail_collection = "";
var promo_code_collection = "";
mongoclient.connect(url, function (err, client) {
    if (err) throw (err)
    const db = client.db("Cake_Shop");
    customer_detail_collection = db.collection("customer_detail");
    cat_detail_collection = db.collection("cat_detail");
    cake_detail_collection = db.collection("cake_detail");
    cart_detail_collection = db.collection("cart_detail");
    order_detail_collection = db.collection("order_detail");
    promo_code_collection = db.collection("promo_code_detail");
    console.log("Database Connected Successfully");
})




app.get('/', function (req, res) {
    res.render('default/home')
})


app.get('/about', function (req, res) {
    res.render('default/about')

})

app.get('/contact', function (req, res) {
    res.render('default/contact')

})

app.get('/login', function (req, res) {
    res.render('default/login')

})

app.post('/check_user', function (req, res) {
    const { txtemail, txtpwd } = req.body;
    sess = req.session;
    if (txtemail === "admin@cakeshop.com" && txtpwd === "admin") {
        res.write("<script>alert('Admin Login Successfully'); window.location.href='/admin_manage_cat';</script>")
    } else {
        customer_detail_collection.findOne({ email_id: txtemail, pwd: txtpwd }, function (err, result) {
            if (err) throw err;
            if (result === null) {
                res.write("<script>alert('Check Your Email Id Or Password'); window.location.href='/login';</script>")
            } else {
                sess.emailid = result.email_id;
                if (sess.ord) {
                    delete sess.ord;
                    res.redirect("/order_form");
                    //res.write("<script>alert('Customer Login Successfully'); window.location.href='/order_form';</script>")        
                } else {
                    //res.write("<script>alert('Customer Login Successfully'); window.location.href='/view_cake';</script>")        
                    res.redirect("/view_cake");
                }
            }
        })
    }

})



app.get('/registration', function (req, res) {
    res.render('default/registration')

})

app.post('/add_customer', function (req, res) {
    const { txtname, txtadd, txtcity, txtmno, txtemail, txtpwd } = req.body;

    customer_detail_collection.findOne({ email_id: txtemail }, function (err, result) {
        if (err) throw err;
        if (result === null) {
            customer_detail_collection.insertOne({ cust_name: txtname, address: txtadd, city: txtcity, mobile_no: txtmno, email_id: txtemail, pwd: txtpwd, status: 0 }, function (err) {
                if (err) throw err;
                res.write("<script>alert('Register Successfully'); window.location.href='/login';</script>")
            })
        } else {
            res.write("<script>alert('Email Id already Exists'); window.location.href='/registration';</script>")
        }
    })
})

app.get('/logout', function (req, res) {
    if (req.session) {
        sess = req.session;
        req.session.destroy(() => {
            res.redirect("/");
        });
    } else {
        res.redirect("/");
    }
})

//Manage Category route
app.get('/admin_manage_cat', function (req, res) {
    cat_detail_collection.find().toArray(function (err, result) {

        res.render('admin/admin_manage_cat', { layout: 'layouts/adminlayouts', catitems: result });
    });
})

app.post('/add_cat', function (req, res) {
    const { txtcat } = req.body;

    cat_detail_collection.find({ category: txtcat }, function (err, result) {
        if (err) throw err;
        if (result === null) {
            let catid = 0;
            cat_detail_collection.find().sort({ cat_id: -1 }).limit(1).toArray(function (err, data1) {
                if (err) throw err;
                if (data1.length === 0) {
                    catid = 1;
                } else {
                    var row = JSON.parse(JSON.stringify(data1[0]));
                    catid = row.cat_id + 1;
                }

                cat_detail_collection.insertOne({ cat_id: catid, category: txtcat }, function (err) {
                    if (err) throw err;
                    res.write("<script>alert('Category Saved Successfully'); window.location.href='/admin_manage_cat';</script>")
                })
            })
        }
        else {
            res.write("<script>alert('Category already Exists'); window.location.href='/admin_manage_cat';</script>")
        }
    })
})

app.get("/delete_cat/:cid", function (req, res) {
    let catid = parseInt(req.params.cid);
    cat_detail_collection.remove({ cat_id: catid }, function (err, result) {
        if (err) throw err;
        res.write("<script>alert('Category Deleted Successfully'); window.location.href='/admin_manage_cat';</script>")
    })
})

app.get("/edit_cat/:cid", function (req, res) {
    let catid = parseInt(req.params.cid);
    var items = [];
    cat_detail_collection.find({ cat_id: catid }).toArray(function (err, result) {
        if (err) throw err;
        //console.log(result);
        res.render("admin/admin_update_cat", { layout: 'layouts/adminlayouts', items: result });
    })
})

app.post("/update_cat", function (req, res) {
    const { txtcid, txtcat } = req.body;
    cat_detail_collection.updateOne({ cat_id: parseInt(txtcid) }, { $set: { category: txtcat } }, function (err, result) {
        if (err) throw err;
        res.write("<script>alert('Category Updated Successfully'); window.location.href='/admin_manage_cat';</script>")
    })

})
//Manage Category code end...


//Manage Promo code
app.get('/admin_manage_promo_code', function (req, res) {
    promo_code_collection.find().toArray(function (err, result) {

        res.render('admin/admin_manage_promo_code', { layout: 'layouts/adminlayouts', promo_code: result });
    });
})


app.post('/add_promo', function (req, res) {
    const { txtpromo, txtamt } = req.body;


    let promoid = 0;
    promo_code_collection.find().sort({ promo_code_id: -1 }).limit(1).toArray(function (err, data1) {
        if (err) throw err;
        if (data1.length === 0) {
            promoid = 1;
        } else {
            var row = JSON.parse(JSON.stringify(data1[0]));
            promoid = row.promo_code_id + 1;
        }

        promo_code_collection.insertOne({ promo_code_id: promoid, promo_code_name: txtpromo,dis_amount: txtamt,status:0}, function (err) {
            if (err) throw err;
            res.write("<script>alert('Promo Code Saved Successfully'); window.location.href='/admin_manage_promo_code';</script>")
        })
    })

})


app.get("/disable_promo/:pcid", function (req, res) {
    let promoid = parseInt(req.params.pcid);
    var items = [];
    promo_code_collection.updateOne({ promo_code_id: parseInt(promoid) }, { $set: { status: 1 } }, function (err, result) {
        if (err) throw err;
        res.write("<script>alert('Promo Code Disabled For Customer Successfully'); window.location.href='/admin_manage_promo_code';</script>")
    })
})

app.get("/enable_promo/:pcid", function (req, res) {
    let promoid = parseInt(req.params.pcid);
    var items = [];
    promo_code_collection.updateOne({ promo_code_id: parseInt(promoid) }, { $set: { status: 0 } }, function (err, result) {
        if (err) throw err;
        res.write("<script>alert('Promo Code Enabled For Customer Successfully'); window.location.href='/admin_manage_promo_code';</script>")
    })
})

//manage promo code end..
//admin register
app.get('/admin/register', (req, res) => {
    res.render('admin/admin_register');
    // console.log("runing")
});

// Route to handle registration form submission
app.post('/admin/register', (req, res) => {
    const { username, pass1, confpass1 } = req.body;

    if (!username || !pass1 || !confpass1) {
        res.write("<script>alert('All Fields are required'); window.location.href='/login';</script>")
        return;
    }

    if (pass1 !== confpass1) {
        res.write("<script>alert('Password and confirm password are diffrent'); window.location.href='/login';</script>")
        return;
    }

    if (pass1.trim().length < 6) {
        res.write("<script>alert('Password is small'); window.location.href='/login';</script>")
        return;
    }

    const newAdmin = {
        username,
        password: pass1 // For simplicity, store the password as plaintext (not recommended in production)
    };

    let admins = [];
    try {
        const adminsData = fs.readFileSync('admins.json', 'utf8');
        admins = JSON.parse(adminsData);
    } catch (err) {
        // File doesn't exist or is empty
    }

    admins.push(newAdmin);

    fs.writeFileSync('admins.json', JSON.stringify(admins, null, 2));

    // Render the registration page with admin details
    res.render('admin/admin_register', { successMsg: 'Admin registered successfully!', newAdmin });
});
//admin login
app.get('/admin/login', (req, res) => {
    res.render('admin/admin_login');
});
adminUsername = 'admin';
adminPassword = 'admin';
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;

    // Read the admins JSON file
    fs.readFile('admins.json', 'utf8', (err, data) => {
        if (err) {
            res.send('Error reading the file.');
            return;
        }

        try {
            const admins = JSON.parse(data);

            // Check if the credentials match any admin entry
            const foundAdmin = admins.find(admin => admin.username === username && admin.password === password);

            if (foundAdmin) {
                // For simplicity, consider setting a session/cookie to track login status
                res.redirect('/admin_manage_cake');
            } else {
                res.write("<script>alert('Invalid credientiALS'); window.location.href='/login';</script>")
            }
        } catch (err) {
            res.send('Error parsing JSON data.');
        }
    });
});

//Manage Cake Coding start....
app.get("/admin_manage_cake", function (req, res) {
    cat_detail_collection.find().toArray(function (err, result) {
        cake_detail_collection.find().toArray(function (err2, result2) {
            res.render("admin/admin_manage_cake", { layout: 'layouts/adminlayouts', catitems: result, items: result2 });
        })
    })

})

app.post("/add_cake", function (req, res) {

    let sampleFile;
    let uploadpath;
    let tmppath;

    const max = 9999;
    const min = 1000;
    const x = (Math.random() * (max - min)) + min;

    if (!req.files || Object.keys(req.files).length == 0) {
        res.write("<script>alert('Please Select PRoduct Image'); window.location.href='/admin_manage_cake';</script>")
    } else {
        const { txtname, txtdesc, selcat, txtprice } = req.body;
        sampleFile = req.files.txtimg;
        let cakeid = 0;
        cake_detail_collection.find().sort({ cake_id: -1 }).limit(1).toArray(function (err, data1) {
            if (err) throw err;
            if (data1.length === 0) {
                cakeid = 1;
            } else {
                var row = JSON.parse(JSON.stringify(data1[0]));
                cakeid = row.cake_id + 1;
            }

            tmppath = "/cake_img/C" + cakeid + "_" + Math.floor(x) + ".png";
            uploadpath = __dirname + "/public" + tmppath;


            cake_detail_collection.insertOne({ cake_id: cakeid, cake_name: txtname, description: txtdesc, cat_id: selcat, price: txtprice, cake_img: tmppath }, function (err) {
                if (err) throw err;
                sampleFile.mv(uploadpath, function (err) {
                    if (err) throw err;
                    res.write("<script>alert('Product Saved Successfully'); window.location.href='/admin_manage_cake';</script>")
                })
            })
        })
    }

})

app.get("/edit_cake/:cid", function (req, res) {
    let cakeid = parseInt(req.params.cid);
    var items = [];
    cat_detail_collection.find().toArray(function (err, result) {
        cake_detail_collection.find({ cake_id: cakeid }).toArray(function (err2, result2) {
            if (err) throw err;
            //console.log(result);
            res.render("admin/admin_update_cake", { layouts: 'layout/adminlayouts', catitems: result, items: result2 });
        })
    })

})

app.post("/update_cake", function (req, res) {
    const { txtcid, txtname, txtdesc, selcat, txtprice } = req.body;
    if (!req.files || Object.keys(req.files).length == 0) {
        cake_detail_collection.updateOne({ cake_id: parseInt(txtcid) }, { $set: { cake_name: txtname, description: txtdesc, cat_id: selcat, price: txtprice } }, function (err, result) {
            if (err) throw err;
            res.write("<script>alert('Product Updated Successfully'); window.location.href='/admin_manage_cake';</script>")
        })
    } else {
        let sampleFile;
        let uploadpath;
        let tmppath;

        const max = 9999;
        const min = 1000;
        const x = (Math.random() * (max - min)) + min;

        sampleFile = req.files.txtimg;
        tmppath = "/cake_img/C" + txtcid + "_" + Math.floor(x) + ".png";
        uploadpath = __dirname + "/public" + tmppath;
        cake_detail_collection.updateOne({ cake_id: parseInt(txtcid) }, { $set: { cake_name: txtname, description: txtdesc, cat_id: selcat, price: txtprice, cake_img: tmppath } }, function (err, result) {
            if (err) throw err;
            sampleFile.mv(uploadpath, function (err) {
                if (err) throw err;
                res.write("<script>alert('product Updated Successfully'); window.location.href='/admin_manage_cake';</script>")
            })

        })
    }

})

app.get("/delete_cake/:cid", function (req, res) {
    let cakeid = parseInt(req.params.cid);
    cake_detail_collection.remove({ cake_id: cakeid }, function (err, result) {
        if (err) throw err;
        res.write("<script>alert('Product Deleted Successfully'); window.location.href='/admin_manage_cake';</script>")
    })
})
//Manage Cake Coding end....



//View cake coding start
app.get("/view_cake", function (req, res) {
    cat_detail_collection.find().toArray(function (err, result) {
        cake_detail_collection.find().toArray(function (err2, result2) {
            res.render("customer/view_cake", { catitems: result, items: result2 });
        })
    })
})

app.get("/view_cakes/:catid", function (req, res) {
    let catid = parseInt(req.params.catid);
    cat_detail_collection.find().toArray(function (err, result) {
        cake_detail_collection.find({ cat_id: catid }).toArray(function (err2, result2) {
            res.render("customer/view_cake", { catitems: result, items: result2 });
        })
    })
})

app.get("/view_cake_detail/:cakeid", function (req, res) {
    let cakeid = parseInt(req.params.cakeid);
    cat_detail_collection.find().toArray(function (err, result) {
        cake_detail_collection.find({ cake_id: cakeid }).toArray(function (err2, result2) {
            res.render("customer/view_cake_detail", { catitems: result, items: result2 });
        })
    })
})
//View cake coding end

//manage cart coding start
app.post("/add_cart", function (req, res) {
    const { txtqty, selsize, txtamt, txtprice, txtcakeid } = req.body;
    console.log(txtqty," ",selsize," ",txtamt," ",txtprice," ",txtcakeid)
    sess = req.session;
    //console.log(sess.cartid);
    if (sess.cartid) {
        let cartdid = 0;
        cart_detail_collection.find().sort({ cart_detail_id: -1 }).limit(1).toArray(function (err, data1) {
            if (err) throw err;
            if (data1.length === 0) {
                cartdid = 1;
            } else {
                var row = JSON.parse(JSON.stringify(data1[0]));
                cartdid = row.cart_detail_id + 1;
            }

            let cartid = sess.cartid;

            cart_detail_collection.insertOne({ cart_detail_id: cartdid, cart_id: cartid, cake_id: parseInt(txtcakeid), cake_size: parseInt(selsize), qty: parseInt(txtqty), price: parseInt(txtprice) }, function (err) {
                if (err) throw err;
                res.redirect("/view_cake");
            })
        })
    }
    else {
        let cartdid = 0;
        cart_detail_collection.find().sort({ cart_detail_id: -1 }).limit(1).toArray(function (err, data1) {
            if (err) throw err;
            if (data1.length === 0) {
                cartdid = 1;
            } else {
                var row = JSON.parse(JSON.stringify(data1[0]));
                cartdid = row.cart_detail_id + 1;
            }


            cart_detail_collection.find().sort({ cart_id: -1 }).limit(1).toArray(function (err, data2) {
                if (err) throw err;
                if (data2.length === 0) {
                    cartid = 1;
                } else {
                    var row = JSON.parse(JSON.stringify(data2[0]));
                    cartid = row.cart_id + 1;
                }
                cart_detail_collection.insertOne({ cart_detail_id: cartdid, cart_id: cartid, cake_id: parseInt(txtcakeid), cake_size: parseInt(selsize), qty: parseInt(txtqty), price: parseInt(txtprice) }, function (err) {
                    if (err) throw err;
                    sess.cartid = cartid;
                    res.redirect("/view_cake");
                    //res.write("<script>alert('Cake Saved Into Cart Successfully'); window.location.href='/view_cake';</script>")    
                })
            })
        })
    }
})

app.get("/view_cart", function (req, res) {
    sess = req.session;
    let cartid = parseInt(sess.cartid);

    cart_detail_collection.find({ cart_id: cartid }).toArray(function (err, result) {
        cake_detail_collection.find().toArray(function (err2, result2) {
            res.render("customer/view_cart", { cartitems: result, items: result2 });
        })
    })
})


app.get("/edit_cart_items/:cakeid/:cartdid", function (req, res) {
    let cakeid = parseInt(req.params.cakeid);
    let cartdid = parseInt(req.params.cartdid);
    cat_detail_collection.find().toArray(function (err, result) {
        cake_detail_collection.find({ cake_id: cakeid }).toArray(function (err2, result2) {
            cart_detail_collection.find({ cart_detail_id: cartdid }).toArray(function (err3, result3) {
                res.render("customer/edit_cart_items", { catitems: result, items: result2, cartitems: result3 });
            })

        })
    })
})

app.post("/update_cart", function (req, res) {
    const { txtqty, selsize, txtamt, txtprice, txtcakeid } = req.body;
    sess = req.session;
    let cartid = parseInt(sess.cartid);
    cart_detail_collection.updateOne({ cake_id: parseInt(txtcakeid), cart_id: cartid }, { $set: { qty: parseInt(txtqty), cake_size: parseInt(selsize) } }, function (err, result) {
        if (err) throw err;
        res.write("<script>alert('Quantity Updated Into Cart Successfully'); window.location.href='/view_cart';</script>")
    })
})


app.get("/delete_cart_items/:cartdid", function (req, res) {
    let cartdid = parseInt(req.params.cartdid);
    cart_detail_collection.remove({ cart_detail_id: cartdid }, function (err, result) {
        if (err) throw err;
        res.write("<script>alert('Cake Deleted From Cart Successfully'); window.location.href='/view_cart';</script>")
    })

})
//manage cart coding end

//manage placed order coding start....
app.get("/placed_order", function (req, res) {
    sess = req.session;
    if (sess.emailid) {
        res.redirect("/order_form")
    } else {
        sess.ord = "x";
        res.redirect("/login");
    }
})

app.get("/order_form", function (req, res) {
    promo_code_collection.find({status: 0}).toArray(function (err, result) {

        res.render('customer/order_form', { promo_code: result });
    });
    

})

app.post('/add_order', function (req, res) {
    const { txtadd, txtcity, txtmno,selpromo,txtdamt } = req.body;
    sess = req.session;
    let emailid = sess.emailid;
    let cartid = sess.cartid;
    var htmldata;
    htmldata = "<h3>Your Order Placed Successfully and Your Order is</h3><br/>";
    cart_detail_collection.find({ cart_id: cartid }).toArray(function (err, res1) {

        cake_detail_collection.find().toArray(function (err2, res2) {
            htmldata += "<table border='1'>";
            htmldata += "<tr>";
            htmldata += "<th>SRNO</th>";
            htmldata += "<th>Product NAME</th>";
            htmldata += "<th>Product Quantity</th>";
            // htmldata += "<th>CAKE QUANTITY</th>";
            htmldata += "<th>Product PRICE</th>";
            htmldata += "<th>Product AMOUNT</th>";
            htmldata += "</tr>";
            var i = 1;
            for (var x in res1) {
                htmldata += "<tr>";
                htmldata += "<td>" + i + "</td>";
                i++;

                /*console.log("x = "+result[x].cart_id);
                console.log("cartdid = "+result[x].cart_detail_id);
                console.log("cakeid = "+result[x].cake_id);*/
                for (var y in res2) {
                    if (res1[x].cake_id == res2[y].cake_id) {
                        //console.log("cakename : "+result2[y].cake_name);
                        htmldata += "<td>" + res2[y].cake_name + "</td>";
                    }
                }
                /*console.log("cakesize = "+result[x].cake_size);
                console.log("qty = "+result[x].qty);
                console.log("price = "+result[x].price);*/
                htmldata += "<td>" + res1[x].cake_size + ". </td>";
                // htmldata += "<td>" + res1[x].qty + "</td>";
                htmldata += "<td>" + res1[x].price + "</td>";
                htmldata += "<td>"+ parseInt(res1[x].cake_size) * parseInt(res1[x].price) + "</td>";
                htmldata += "</tr>";
            }
            htmldata += "</table>";
            
        })
    })

    console.log("Promo = "+selpromo);
    cart_detail_collection.aggregate([{ $match: { cart_id: parseInt(cartid) } }, { $group: { "_id": "$cart_id", total: { $sum: { $multiply: ["$price", "$qty", "$cake_size"] } } } }]).toArray(function (err, result) {
        //console.log(result)
        //console.log(result[0].total);
        let amt = parseInt(result[0].total);
        let damt = parseInt(txtdamt);
        htmldata += "<br/><h3>TOTAL AMOUNT: &#8377; "+amt+"/-</h3>";
        htmldata += "<h3>DISCOUNT AMOUNT: &#8377; "+damt+"/-</h3>";
        htmldata += "<h3>BILL AMOUNT: &#8377;"+(amt-damt)+"/- </h3>";
        let orderid = 0;
        var dt = new Date();
        var tdate = dt.getFullYear() + "/" + (dt.getMonth() + 1) + "/" + dt.getDate();
        order_detail_collection.find().sort({ order_id: -1 }).limit(1).toArray(function (err, data1) {
            if (err) throw err;
            if (data1.length === 0) {
                orderid = 1;
            } else {
                var row = JSON.parse(JSON.stringify(data1[0]));
                orderid = row.order_id + 1;
            }

            
            var mailOptions = {
                from: 'cake.shop.valsad@gmail.com',
                to: emailid,
                subject: 'Agriculture Order Detail',
                //text: 'Your Order Placed Successfully and your Order id is '+orderid+' and Your Order is',
                html: htmldata
            };
            order_detail_collection.insertOne({ order_id: orderid, order_date: tdate, cart_id: cartid, del_add: txtadd, del_city: txtcity, del_mno: txtmno, order_amount: amt, email_id: emailid,dis_amount: damt }, function (err) {
                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                });
                if (err) throw err;
                delete sess.cartid;
                //res.write("<script>alert('Order Placed Successfully'); window.location.href='/view_cake';</script>")    
                res.redirect("/view_cake");
            })
        })
    })


})

//manage placed order coding end...


//view order coding start..

app.get("/customer_view_order", function (req, res) {
    sess = req.session;
    let emailid = sess.emailid;
    order_detail_collection.find({ email_id: emailid }).toArray(function (err, result3) {
        res.render("customer/view_orders", { orditems: result3 });
    })

})

app.get("/customer_view_order_detail/:cartid", function (req, res) {

    let cartid = parseInt(req.params.cartid);
    cart_detail_collection.find({ cart_id: cartid }).toArray(function (err, result) {
        cake_detail_collection.find().toArray(function (err2, result2) {
            res.render("customer/view_order_detail", { cartitems: result, items: result2 });
        })
    })
})
//view order coding end...


//Change Password Coding Start.

app.get("/customer_change_pwd", function (req, res) {
    res.render('customer/customer_change_pwd');
})

app.post("/change_pwd",function(req,res){
    const { txtopwd, txtnpwd, txtcpwd } = req.body;
    sess = req.session;
    let emailid = sess.emailid;
    
    customer_detail_collection.findOne({ email_id: emailid,pwd:txtopwd }, function (err, result) {
        if (err) throw err;
        if (result === null) {
            res.write("<script>alert('Old Password Not Matched'); window.location.href='/customer_change_pwd';</script>")
        } else {
            customer_detail_collection.updateOne({ email_id: emailid }, { $set: { pwd: txtnpwd } }, function (err, result) {
                if (err) throw err;
                res.write("<script>alert('Password Changed Successfully'); window.location.href='/';</script>")
            })
            
        }
    })
})
//Change Password coding end...

app.listen(3000, () => {
    console.log("Express Start at port no 3000 click here http://127.0.0.1:3000/ to open a page")
})
