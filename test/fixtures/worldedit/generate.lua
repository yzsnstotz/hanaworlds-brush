-- Regenerate with: lua test/fixtures/worldedit/generate.lua src/shapes/upstream
-- Runs the pinned, unmodified Lua algorithms against an in-memory VoxelArea.
-- No Luanti/WorldEdit runtime, world connection or material semantics are used.
local root = assert(arg[1], 'source directory required')
vector = {}
function vector.new(x,y,z)
 if type(x)=='table' then return {x=x.x,y=x.y,z=x.z} end
 return {x=x or 0,y=y or 0,z=z or 0}
end
for _, op in ipairs({'add','subtract'}) do
 vector[op] = function(a,b)
  if type(b)=='number' then b=vector.new(b,b,b) end
  local sign=op=='add' and 1 or -1
  return vector.new(a.x+sign*b.x,a.y+sign*b.y,a.z+sign*b.z)
 end
end
worldedit = {}
minetest = {get_content_id=function() return 1 end}
dofile(root..'/common.lua')
local area={MinEdge=vector.new(-64,-64,-64),ystride=129,zstride=129*129}
function area:index(x,y,z) return x+64+(y+64)*self.ystride+(z+64)*self.zstride+1 end
function area:iterp(lo,hi)
 return coroutine.wrap(function()
  for z=lo.z,hi.z do for y=lo.y,hi.y do for x=lo.x,hi.x do
   coroutine.yield(self:index(x,y,z))
  end end end
 end)
end
local data
worldedit.manip_helpers.init=function() return {},area end
worldedit.manip_helpers.get_empty_data=function() return {} end
worldedit.manip_helpers.finish=function(_,out) data=out end
dofile(root..'/primitives.lua')
local function json(v)
 if type(v)=='table' then
  local out={}; for _,item in ipairs(v) do out[#out+1]=json(item) end
  return '['..table.concat(out,',')..']'
 elseif type(v)=='string' then return string.format('%q',v)
 else return tostring(v) end
end
local cases={}
local function run(name,params)
 data=nil
 local args={vector.new(3,-2,5)}
 for _,v in ipairs(params) do args[#args+1]=v end
 -- Material argument precedes hollow in the upstream signatures.
 if name~='spiral' then table.insert(args,#args, 'fixture') else args[#args+1]='fixture' end
 local count=worldedit[name](table.unpack(args))
 local positions={}
 for index in pairs(data) do
  local i=index-1
  positions[#positions+1]={i%129-64,math.floor(i/129)%129-64,math.floor(i/(129*129))-64}
 end
 table.sort(positions,function(a,b) return a[1]<b[1] or a[1]==b[1] and (a[2]<b[2] or a[2]==b[2] and a[3]<b[3]) end)
 cases[#cases+1]='{"shape":'..json(name)..',"position":[3,-2,5],"args":'..json(params)..',"count":'..count..',"positions":'..json(positions)..'}'
end
for _,hollow in ipairs({false,true}) do
 for n=1,4 do run('cube',{n,n,n,hollow}) end
 run('cube',{6,5,4,hollow}); run('cube',{2,5,4,hollow})
 run('cube',{1,5,4,hollow}); run('cube',{5,1,4,hollow}); run('cube',{5,4,1,hollow})
 for radius=0,3 do run('sphere',{radius,hollow}); run('dome',{radius,hollow}) end
 for radius=-3,-1 do run('dome',{radius,hollow}) end
 for _,axis in ipairs({'x','y','z'}) do
  for _,p in ipairs({{1,0,0},{3,2,2},{4,3,0},{4,0,3},{-4,3,0},{-4,0,3}}) do
   run('cylinder',{axis,p[1],p[2],p[3],hollow})
  end
  for _,height in ipairs({1,2,4,-1,-2,-4}) do run('pyramid',{axis,height,hollow}) end
 end
end
for _,p in ipairs({{0,1,0},{1,2,0},{5,3,0},{6,2,1},{7,1,2}}) do run('spiral',p) end
io.write('{"sourceRevision":"62ffafe3bcb386600c431ef3840d91c3c8f85639","cases":[\n'..table.concat(cases,',\n')..'\n]}\n')
