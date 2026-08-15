"""API 資料契約。

CharaSlot 是「5 個獨立卡槽」的資料契約：chara 與 charaLevel 由同一個
陣列展開，所以 main.py:369 的 zip() 靜默截短問題在型別層就不可能發生。
"""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Category = Literal["chara", "icon", "frame", "plate"]
TitleRare = Literal["Normal", "Bronze", "Silver", "Gold", "Rainbow"]


class CharaSlot(BaseModel):
    id: int = Field(ge=0, le=999999, description="旅行夥伴角色 ID")
    level: int = Field(default=1, ge=1, le=9999)


class CardRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nickname: str = Field(default=" ", max_length=16)
    title: str = Field(default="", max_length=32)
    titleRare: TitleRare = "Normal"
    icon: int = Field(ge=0, le=999999)
    frame: int = Field(ge=0, le=999999)
    plate: int = Field(ge=0, le=999999)
    rating: int = Field(default=0, ge=0, le=99999)
    # -1 = 不顯示（main.py:86 `if 25 >= classRank >= 0`）
    classRank: int = Field(default=-1, ge=-1, le=25)
    # -1 = 不顯示（main.py:96 `if 23 >= rankRating >= 0`）
    courseRank: int = Field(default=-1, ge=-1, le=23)
    chara: list[CharaSlot] = Field(default_factory=list, max_length=5)

    def to_user_data(self) -> dict:
        return {
            "nickname": self.nickname,
            "title": self.title,
            "icon": self.icon,
            "frame": self.frame,
            "plate": self.plate,
            "rating": self.rating,
            "classRank": self.classRank,
            "courseRank": self.courseRank,
            "titleRare": self.titleRare,
            "chara": [c.id for c in self.chara],
            "charaLevel": [c.level for c in self.chara],
        }


class AssetGroup(BaseModel):
    prefix: str
    count: int


class AssetIndexResponse(BaseModel):
    category: Category
    total: int
    # 純 int 陣列，1150 筆 gzip 後約 2.6 KB。
    # 前端一次拿完就能做零延遲本地搜尋、跳轉與虛擬捲動。
    ids: list[int]
    # ID 前兩碼的分組（版本世代），素材無名稱時唯一的免費分類軸。
    # 用 list 而非 dict：JSON 物件的 "10"/"15" 這種整數樣式的 key 在
    # JavaScript 會被提前並依數值排序，"00"/"05" 反而被擠到最後。
    groups: list[AssetGroup]


class HealthResponse(BaseModel):
    status: Literal["ok"]
    assetCounts: dict[str, int]
    thumbsCached: dict[str, int]
